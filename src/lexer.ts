import type { Token, Position } from './types.js'
import { TokenType } from './types.js'

/**
 * HOCON Lexer - Tokenizes HOCON source text
 * Preserves comments and whitespace for formatting
 */
export class Lexer {
  private readonly source: string
  private pos: number = 0
  private line: number = 1
  private column: number = 1
  private readonly tokens: Token[] = []

  constructor (source: string) {
    this.source = source
  }

  /**
   * Tokenize the entire source
   */
  tokenize (): Token[] {
    while (!this.isAtEnd()) {
      this.scanToken()
    }

    this.tokens.push(this.createToken(TokenType.EOF, '', ''))
    return this.tokens
  }

  private scanToken (): void {
    const char = this.peek()

    // Whitespace (not newlines)
    if (char === ' ' || char === '\t' || char === '\r') {
      this.scanWhitespace()
      return
    }

    // Newlines
    if (char === '\n') {
      this.addToken(TokenType.Newline, '\n', '\n')
      this.advance()
      this.line++
      this.column = 1
      return
    }

    // Comments
    if (char === '/' && this.peekNext() === '/') {
      this.scanComment('//')
      return
    }
    if (char === '#') {
      this.scanComment('#')
      return
    }

    // Structural tokens
    if (char === '{') {
      this.addToken(TokenType.LeftBrace, '{', '{')
      this.advance()
      return
    }
    if (char === '}') {
      this.addToken(TokenType.RightBrace, '}', '}')
      this.advance()
      return
    }
    if (char === '[') {
      this.addToken(TokenType.LeftBracket, '[', '[')
      this.advance()
      return
    }
    if (char === ']') {
      this.addToken(TokenType.RightBracket, ']', ']')
      this.advance()
      return
    }
    if (char === ',') {
      this.addToken(TokenType.Comma, ',', ',')
      this.advance()
      return
    }
    if (char === ':') {
      this.addToken(TokenType.Colon, ':', ':')
      this.advance()
      return
    }
    if (char === '=') {
      this.addToken(TokenType.Equals, '=', '=')
      this.advance()
      return
    }
    if (char === '+' && this.peekNext() === '=') {
      this.addToken(TokenType.PlusEquals, '+=', '+=')
      this.advance()
      this.advance()
      return
    }

    // Substitution ${...} or ${?...}
    if (char === '$' && this.peekNext() === '{') {
      this.scanSubstitution()
      return
    }

    // Triple-quoted string
    if (char === '"' && this.peekNext() === '"' && this.peekAt(2) === '"') {
      this.scanMultilineString()
      return
    }

    // Quoted string
    if (char === '"') {
      this.scanQuotedString()
      return
    }

    // Numbers
    if (this.isDigit(char) || (char === '-' && this.isDigit(this.peekNext()))) {
      this.scanNumber()
      return
    }

    // Keywords and unquoted strings/keys
    if (this.isUnquotedChar(char)) {
      this.scanUnquoted()
      return
    }

    // Unknown character - skip it
    this.advance()
  }

  private scanWhitespace (): void {
    const start = this.pos
    while (!this.isAtEnd() && (this.peek() === ' ' || this.peek() === '\t' || this.peek() === '\r')) {
      this.advance()
    }
    const value = this.source.slice(start, this.pos)
    this.addTokenAt(TokenType.Whitespace, value, value, start)
  }

  private scanComment (style: '//' | '#'): void {
    const start = this.pos

    // Skip comment marker
    if (style === '//') {
      this.advance()
      this.advance()
    } else {
      this.advance()
    }

    // Read until end of line
    while (!this.isAtEnd() && this.peek() !== '\n') {
      this.advance()
    }

    const raw = this.source.slice(start, this.pos)
    const value = style === '//' ? raw.slice(2) : raw.slice(1)
    this.addTokenAt(TokenType.Comment, value, raw, start)
  }

  private scanSubstitution (): void {
    const start = this.pos
    this.advance() // $
    this.advance() // {

    const optional = this.peek() === '?'
    if (optional) {
      this.advance()
    }

    // Read path until }
    const pathStart = this.pos
    while (!this.isAtEnd() && this.peek() !== '}') {
      this.advance()
    }
    const path = this.source.slice(pathStart, this.pos)

    if (!this.isAtEnd()) {
      this.advance() // }
    }

    const raw = this.source.slice(start, this.pos)
    this.addTokenAt(TokenType.Substitution, path, raw, start)
  }

  private scanMultilineString (): void {
    const start = this.pos
    this.advance() // "
    this.advance() // "
    this.advance() // "

    const valueStart = this.pos
    while (!this.isAtEnd()) {
      if (this.peek() === '"' && this.peekNext() === '"' && this.peekAt(2) === '"') {
        break
      }
      if (this.peek() === '\n') {
        this.line++
        this.column = 0
      }
      this.advance()
    }

    const value = this.source.slice(valueStart, this.pos)

    // Skip closing """
    if (!this.isAtEnd()) {
      this.advance()
      this.advance()
      this.advance()
    }

    const raw = this.source.slice(start, this.pos)
    this.addTokenAt(TokenType.MultilineString, value, raw, start)
  }

  private scanQuotedString (): void {
    const start = this.pos
    this.advance() // Opening "

    let value = ''
    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === '\\' && !this.isAtEnd()) {
        this.advance()
        const escaped = this.peek()
        switch (escaped) {
          case 'n': value += '\n'; break
          case 't': value += '\t'; break
          case 'r': value += '\r'; break
          case '\\': value += '\\'; break
          case '"': value += '"'; break
          default: value += '\\' + escaped
        }
        this.advance()
      } else {
        value += this.peek()
        this.advance()
      }
    }

    if (!this.isAtEnd()) {
      this.advance() // Closing "
    }

    const raw = this.source.slice(start, this.pos)
    this.addTokenAt(TokenType.String, value, raw, start)
  }

  private scanNumber (): void {
    const start = this.pos

    if (this.peek() === '-') {
      this.advance()
    }

    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      this.advance()
    }

    // Decimal part
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance()
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        this.advance()
      }
    }

    // Exponent
    if (this.peek() === 'e' || this.peek() === 'E') {
      this.advance()
      if (this.peek() === '+' || this.peek() === '-') {
        this.advance()
      }
      while (!this.isAtEnd() && this.isDigit(this.peek())) {
        this.advance()
      }
    }

    const raw = this.source.slice(start, this.pos)
    this.addTokenAt(TokenType.Number, raw, raw, start)
  }

  private scanUnquoted (): void {
    const start = this.pos

    while (!this.isAtEnd() && this.isUnquotedChar(this.peek())) {
      this.advance()
    }

    const value = this.source.slice(start, this.pos)

    // Check for keywords
    if (value === 'true' || value === 'false') {
      this.addTokenAt(TokenType.Boolean, value, value, start)
    } else if (value === 'null') {
      this.addTokenAt(TokenType.Null, value, value, start)
    } else if (value === 'include') {
      this.addTokenAt(TokenType.Include, value, value, start)
    } else {
      // Could be a key or unquoted string
      this.addTokenAt(TokenType.Key, value, value, start)
    }
  }

  private isUnquotedChar (char: string): boolean {
    // HOCON unquoted strings can contain these characters
    return /[a-zA-Z0-9_\-.]/.test(char)
  }

  private isDigit (char: string): boolean {
    return /[0-9]/.test(char)
  }

  private isAtEnd (): boolean {
    return this.pos >= this.source.length
  }

  private peek (): string {
    return this.source[this.pos] ?? ''
  }

  private peekNext (): string {
    return this.source[this.pos + 1] ?? ''
  }

  private peekAt (offset: number): string {
    return this.source[this.pos + offset] ?? ''
  }

  private advance (): string {
    const char = this.source[this.pos] ?? ''
    this.pos++
    this.column++
    return char
  }

  private getPosition (): Position {
    return {
      line: this.line,
      column: this.column,
      offset: this.pos
    }
  }

  private createToken (type: TokenType, value: string, raw: string): Token {
    const start = this.getPosition()
    return {
      type,
      value,
      raw,
      location: {
        start,
        end: start
      }
    }
  }

  private addToken (type: TokenType, value: string, raw: string): void {
    this.tokens.push(this.createToken(type, value, raw))
  }

  private addTokenAt (type: TokenType, value: string, raw: string, startOffset: number): void {
    const endPos = this.getPosition()
    const startLine = this.line
    const startCol = this.column - (this.pos - startOffset)

    this.tokens.push({
      type,
      value,
      raw,
      location: {
        start: {
          line: startLine,
          column: startCol,
          offset: startOffset
        },
        end: endPos
      }
    })
  }
}

/**
 * Tokenize HOCON source
 */
export function tokenize (source: string): Token[] {
  const lexer = new Lexer(source)
  return lexer.tokenize()
}
