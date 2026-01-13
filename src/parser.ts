import type {
  Token,
  DocumentNode,
  FieldNode,
  KeyNode,
  ValueNode,
  ObjectNode,
  ArrayNode,
  StringNode,
  NumberNode,
  BooleanNode,
  NullNode,
  SubstitutionNode,
  IncludeNode,
  CommentNode,
} from './types.js';
import { TokenType } from './types.js';
import { tokenize } from './lexer.js';

/**
 * HOCON Parser - Builds AST from tokens
 * Preserves comments for formatting
 */
export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private pendingComments: CommentNode[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Parse tokens into AST
   */
  parse(): DocumentNode {
    const body: (FieldNode | IncludeNode | CommentNode)[] = [];
    const startLoc = this.currentToken().location;

    this.skipWhitespaceAndNewlines();

    while (!this.isAtEnd()) {
      // Collect leading comments
      this.collectComments();

      if (this.isAtEnd()) {
        break;
      }

      const node = this.parseRootElement();
      if (node) {
        // Attach pending comments to node
        if (this.pendingComments.length > 0) {
          node.leadingComments = [...this.pendingComments];
          this.pendingComments = [];
        }
        body.push(node);
      }

      this.skipWhitespaceAndNewlines();
    }

    // Add any remaining comments
    for (const comment of this.pendingComments) {
      body.push(comment);
    }

    return {
      type: 'Document',
      body,
      location: {
        start: startLoc.start,
        end: this.currentToken().location.end,
      },
    };
  }

  private parseRootElement(): FieldNode | IncludeNode | CommentNode | null {
    const token = this.currentToken();

    if (token.type === TokenType.Include) {
      return this.parseInclude();
    }

    if (token.type === TokenType.Key || token.type === TokenType.String) {
      return this.parseField();
    }

    if (token.type === TokenType.Comment) {
      return this.parseComment();
    }

    // Skip unknown tokens
    this.advance();
    return null;
  }

  private parseInclude(): IncludeNode {
    const startLoc = this.currentToken().location;
    this.advance(); // 'include'

    this.skipWhitespace();

    let required = false;
    let kind: 'file' | 'url' | 'classpath' = 'file';

    // Check for required() or file() or url() or classpath()
    const nextToken = this.currentToken();
    if (nextToken.type === TokenType.Key) {
      if (nextToken.value === 'required') {
        required = true;
        this.advance();
        this.skipWhitespace();
        // Expect (
        if (this.currentToken().raw === '(') {
          this.advance();
        }
      } else if (nextToken.value === 'file' || nextToken.value === 'url' || nextToken.value === 'classpath') {
        kind = nextToken.value as 'file' | 'url' | 'classpath';
        this.advance();
        this.skipWhitespace();
        if (this.currentToken().raw === '(') {
          this.advance();
        }
      }
    }

    this.skipWhitespace();

    // Parse the path string
    let path = '';
    if (this.currentToken().type === TokenType.String) {
      path = this.currentToken().value;
      this.advance();
    }

    this.skipWhitespace();

    // Skip closing ) if present
    if (this.currentToken().raw === ')') {
      this.advance();
    }

    // Skip second closing ) for required(file(...))
    this.skipWhitespace();
    if (this.currentToken().raw === ')') {
      this.advance();
    }

    return {
      type: 'Include',
      path,
      required,
      kind,
      location: {
        start: startLoc.start,
        end: this.previousToken().location.end,
      },
    };
  }

  private parseField(): FieldNode {
    const startLoc = this.currentToken().location;
    const key = this.parseKey();

    this.skipWhitespace();

    // Determine separator
    let separator: '=' | ':' | 'none' = 'none';
    const sepToken = this.currentToken();

    if (sepToken.type === TokenType.Equals) {
      separator = '=';
      this.advance();
    } else if (sepToken.type === TokenType.Colon) {
      separator = ':';
      this.advance();
    } else if (sepToken.type === TokenType.PlusEquals) {
      separator = '='; // Treat += as = for formatting
      this.advance();
    }

    this.skipWhitespace();

    const value = this.parseValue();

    // Check for trailing comment on same line
    this.skipWhitespace();
    let trailingComment: CommentNode | undefined;
    if (this.currentToken().type === TokenType.Comment) {
      trailingComment = this.parseComment();
    }

    const field: FieldNode = {
      type: 'Field',
      key,
      separator,
      value,
      location: {
        start: startLoc.start,
        end: this.previousToken().location.end,
      },
    };

    if (trailingComment) {
      field.trailingComment = trailingComment;
    }

    return field;
  }

  private parseKey(): KeyNode {
    const startLoc = this.currentToken().location;
    const parts: string[] = [];
    let raw = '';

    // First part
    if (this.currentToken().type === TokenType.Key || this.currentToken().type === TokenType.String) {
      parts.push(this.currentToken().value);
      raw = this.currentToken().raw;
      this.advance();
    }

    // Additional parts separated by dots (already in key for unquoted)
    // For quoted keys like "foo"."bar", handle them
    while (this.currentToken().raw === '.') {
      raw += '.';
      this.advance();
      if (this.currentToken().type === TokenType.Key || this.currentToken().type === TokenType.String) {
        parts.push(this.currentToken().value);
        raw += this.currentToken().raw;
        this.advance();
      }
    }

    // If raw contains dots and we only have one part, split it
    if (parts.length === 1 && raw.includes('.')) {
      const splitParts = raw.split('.');
      return {
        type: 'Key',
        parts: splitParts,
        raw,
        location: {
          start: startLoc.start,
          end: this.previousToken().location.end,
        },
      };
    }

    return {
      type: 'Key',
      parts,
      raw,
      location: {
        start: startLoc.start,
        end: this.previousToken().location.end,
      },
    };
  }

  private parseValue(): ValueNode {
    // Check for concatenation (multiple values without separator)
    const firstValue = this.parseSingleValue();
    const parts: ValueNode[] = [firstValue];

    // Check for concatenation
    this.skipWhitespace();
    while (this.canStartValue() && !this.isAtLineEnd()) {
      parts.push(this.parseSingleValue());
      this.skipWhitespace();
    }

    if (parts.length === 1) {
      return parts[0]!;
    }

    return {
      type: 'Concatenation',
      parts,
      location: {
        start: firstValue.location.start,
        end: parts[parts.length - 1]!.location.end,
      },
    };
  }

  private parseSingleValue(): ValueNode {
    const token = this.currentToken();

    if (token.type === TokenType.LeftBrace) {
      return this.parseObject();
    }

    if (token.type === TokenType.LeftBracket) {
      return this.parseArray();
    }

    if (token.type === TokenType.String) {
      return this.parseString();
    }

    if (token.type === TokenType.MultilineString) {
      return this.parseMultilineString();
    }

    if (token.type === TokenType.Number) {
      return this.parseNumber();
    }

    if (token.type === TokenType.Boolean) {
      return this.parseBoolean();
    }

    if (token.type === TokenType.Null) {
      return this.parseNull();
    }

    if (token.type === TokenType.Substitution) {
      return this.parseSubstitution();
    }

    if (token.type === TokenType.Key) {
      // Unquoted string value
      return this.parseUnquotedString();
    }

    // Default to empty string
    return {
      type: 'String',
      value: '',
      raw: '',
      multiline: false,
      location: token.location,
    };
  }

  private parseObject(): ObjectNode {
    const startLoc = this.currentToken().location;
    this.advance(); // {

    const fields: (FieldNode | IncludeNode | CommentNode)[] = [];

    this.skipWhitespaceAndNewlines();

    while (!this.isAtEnd() && this.currentToken().type !== TokenType.RightBrace) {
      this.collectComments();

      if (this.currentToken().type === TokenType.RightBrace) {
        break;
      }

      const node = this.parseRootElement();
      if (node) {
        if (this.pendingComments.length > 0) {
          node.leadingComments = [...this.pendingComments];
          this.pendingComments = [];
        }
        fields.push(node);
      }

      // Skip comma if present
      this.skipWhitespace();
      if (this.currentToken().type === TokenType.Comma) {
        this.advance();
      }

      this.skipWhitespaceAndNewlines();
    }

    // Add remaining comments
    for (const comment of this.pendingComments) {
      fields.push(comment);
    }
    this.pendingComments = [];

    if (this.currentToken().type === TokenType.RightBrace) {
      this.advance();
    }

    return {
      type: 'Object',
      fields,
      braceStyle: 'braced',
      location: {
        start: startLoc.start,
        end: this.previousToken().location.end,
      },
    };
  }

  private parseArray(): ArrayNode {
    const startLoc = this.currentToken().location;
    this.advance(); // [

    const elements: (ValueNode | CommentNode)[] = [];

    this.skipWhitespaceAndNewlines();

    while (!this.isAtEnd() && this.currentToken().type !== TokenType.RightBracket) {
      this.collectComments();

      if (this.currentToken().type === TokenType.RightBracket) {
        break;
      }

      // Add comments as elements
      for (const comment of this.pendingComments) {
        elements.push(comment);
      }
      this.pendingComments = [];

      if (this.canStartValue()) {
        elements.push(this.parseValue());
      }

      // Skip comma if present
      this.skipWhitespace();
      if (this.currentToken().type === TokenType.Comma) {
        this.advance();
      }

      this.skipWhitespaceAndNewlines();
    }

    if (this.currentToken().type === TokenType.RightBracket) {
      this.advance();
    }

    return {
      type: 'Array',
      elements,
      location: {
        start: startLoc.start,
        end: this.previousToken().location.end,
      },
    };
  }

  private parseString(): StringNode {
    const token = this.currentToken();
    this.advance();

    return {
      type: 'String',
      value: token.value,
      raw: token.raw,
      multiline: false,
      location: token.location,
    };
  }

  private parseMultilineString(): StringNode {
    const token = this.currentToken();
    this.advance();

    return {
      type: 'String',
      value: token.value,
      raw: token.raw,
      multiline: true,
      location: token.location,
    };
  }

  private parseUnquotedString(): StringNode {
    const token = this.currentToken();
    this.advance();

    return {
      type: 'String',
      value: token.value,
      raw: token.raw,
      multiline: false,
      location: token.location,
    };
  }

  private parseNumber(): NumberNode {
    const token = this.currentToken();
    this.advance();

    return {
      type: 'Number',
      value: parseFloat(token.value),
      raw: token.raw,
      location: token.location,
    };
  }

  private parseBoolean(): BooleanNode {
    const token = this.currentToken();
    this.advance();

    return {
      type: 'Boolean',
      value: token.value === 'true',
      location: token.location,
    };
  }

  private parseNull(): NullNode {
    const token = this.currentToken();
    this.advance();

    return {
      type: 'Null',
      location: token.location,
    };
  }

  private parseSubstitution(): SubstitutionNode {
    const token = this.currentToken();
    this.advance();

    return {
      type: 'Substitution',
      path: token.value,
      optional: token.raw.includes('${?'),
      raw: token.raw,
      location: token.location,
    };
  }

  private parseComment(): CommentNode {
    const token = this.currentToken();
    this.advance();

    return {
      type: 'Comment',
      style: token.raw.startsWith('//') ? '//' : '#',
      value: token.value,
      location: token.location,
    };
  }

  private collectComments(): void {
    while (this.currentToken().type === TokenType.Comment) {
      this.pendingComments.push(this.parseComment());
      this.skipWhitespaceAndNewlines();
    }
  }

  private canStartValue(): boolean {
    const type = this.currentToken().type;
    return (
      type === TokenType.LeftBrace ||
      type === TokenType.LeftBracket ||
      type === TokenType.String ||
      type === TokenType.MultilineString ||
      type === TokenType.Number ||
      type === TokenType.Boolean ||
      type === TokenType.Null ||
      type === TokenType.Substitution ||
      type === TokenType.Key
    );
  }

  private isAtLineEnd(): boolean {
    const type = this.currentToken().type;
    return (
      type === TokenType.Newline ||
      type === TokenType.Comment ||
      type === TokenType.EOF ||
      type === TokenType.RightBrace ||
      type === TokenType.RightBracket ||
      type === TokenType.Comma
    );
  }

  private skipWhitespace(): void {
    while (this.currentToken().type === TokenType.Whitespace) {
      this.advance();
    }
  }

  private skipWhitespaceAndNewlines(): void {
    while (
      this.currentToken().type === TokenType.Whitespace ||
      this.currentToken().type === TokenType.Newline
    ) {
      this.advance();
    }
  }

  private currentToken(): Token {
    return this.tokens[this.pos] ?? this.tokens[this.tokens.length - 1]!;
  }

  private previousToken(): Token {
    return this.tokens[this.pos - 1] ?? this.tokens[0]!;
  }

  private advance(): Token {
    const token = this.currentToken();
    if (!this.isAtEnd()) {
      this.pos++;
    }
    return token;
  }

  private isAtEnd(): boolean {
    return this.currentToken().type === TokenType.EOF;
  }
}

/**
 * Parse HOCON source into AST
 */
export function parse(source: string): DocumentNode {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  return parser.parse();
}
