/**
 * Token types for HOCON lexer
 */
export enum TokenType {
  // Structural
  LeftBrace = 'LeftBrace', // {
  RightBrace = 'RightBrace', // }
  LeftBracket = 'LeftBracket', // [
  RightBracket = 'RightBracket', // ]
  Equals = 'Equals', // =
  Colon = 'Colon', // :
  Comma = 'Comma', // ,
  PlusEquals = 'PlusEquals', // +=

  // Values
  String = 'String', // "quoted" or unquoted
  MultilineString = 'MultilineString', // """triple quoted"""
  Number = 'Number', // 123, 1.5, etc.
  Boolean = 'Boolean', // true, false
  Null = 'Null', // null

  // Special
  Include = 'Include', // include
  Substitution = 'Substitution', // ${path} or ${?path}
  Comment = 'Comment', // // or #
  Newline = 'Newline', // \n
  Whitespace = 'Whitespace', // spaces, tabs
  Key = 'Key', // key path like foo.bar.baz

  // End of file
  EOF = 'EOF',
}

/**
 * Position in source file
 */
export interface Position {
  line: number
  column: number
  offset: number
}

/**
 * Location span in source file
 */
export interface Location {
  start: Position
  end: Position
}

/**
 * Token produced by lexer
 */
export interface Token {
  type: TokenType
  value: string
  raw: string // Original text including quotes, etc.
  location: Location
}

/**
 * Base AST node
 */
export interface BaseNode {
  type: string
  location: Location
  leadingComments?: CommentNode[]
  trailingComment?: CommentNode
  precedingBlankLines?: number // Number of blank lines before this node
}

/**
 * Comment node
 */
export interface CommentNode extends BaseNode {
  type: 'Comment'
  style: '//' | '#'
  value: string
}

/**
 * Root document node
 */
export interface DocumentNode extends BaseNode {
  type: 'Document'
  body: Array<FieldNode | IncludeNode | CommentNode>
}

/**
 * Include statement: include "file.conf"
 */
export interface IncludeNode extends BaseNode {
  type: 'Include'
  path: string
  required: boolean // include required("file.conf")
  kind: 'file' | 'url' | 'classpath'
}

/**
 * Field (key-value pair): key = value
 */
export interface FieldNode extends BaseNode {
  type: 'Field'
  key: KeyNode
  separator: '=' | ':' | 'none' // 'none' for object shorthand
  value: ValueNode
}

/**
 * Key node: simple key or path like foo.bar.baz
 */
export interface KeyNode extends BaseNode {
  type: 'Key'
  parts: string[] // ["foo", "bar", "baz"]
  raw: string // Original text
}

/**
 * Value types
 */
export type ValueNode =
  | StringNode
  | NumberNode
  | BooleanNode
  | NullNode
  | ObjectNode
  | ArrayNode
  | SubstitutionNode
  | ConcatenationNode

/**
 * String value
 */
export interface StringNode extends BaseNode {
  type: 'String'
  value: string
  raw: string
  multiline: boolean
}

/**
 * Number value
 */
export interface NumberNode extends BaseNode {
  type: 'Number'
  value: number
  raw: string
}

/**
 * Boolean value
 */
export interface BooleanNode extends BaseNode {
  type: 'Boolean'
  value: boolean
}

/**
 * Null value
 */
export interface NullNode extends BaseNode {
  type: 'Null'
}

/**
 * Object value: { ... }
 */
export interface ObjectNode extends BaseNode {
  type: 'Object'
  fields: Array<FieldNode | IncludeNode | CommentNode>
  braceStyle: 'braced' | 'root' // root for top-level without braces
}

/**
 * Array value: [ ... ]
 */
export interface ArrayNode extends BaseNode {
  type: 'Array'
  elements: Array<ValueNode | CommentNode>
}

/**
 * Substitution: ${path} or ${?path}
 */
export interface SubstitutionNode extends BaseNode {
  type: 'Substitution'
  path: string
  optional: boolean // ${?path} vs ${path}
  raw: string
}

/**
 * Concatenation of values (HOCON feature)
 */
export interface ConcatenationNode extends BaseNode {
  type: 'Concatenation'
  parts: ValueNode[]
}

/**
 * Formatter options (internal use - not exposed to users)
 */
export interface FormatterOptions {
  indentSize: number
  indentChar: string
  keyValueSeparator: string
  normalizeComments: '//' | '#' | 'preserve'
  trimTrailingWhitespace: boolean
  collapseBlankLines: boolean
  ensureFinalNewline: boolean
  quoteStyle: 'double' | 'minimal' | 'preserve'
  maxLineLength: number
}

/**
 * Default formatter options (opinionated, no configuration)
 */
export const DEFAULT_OPTIONS: FormatterOptions = {
  indentSize: 2,
  indentChar: ' ',
  keyValueSeparator: ' = ',
  normalizeComments: '//',
  trimTrailingWhitespace: true,
  collapseBlankLines: true,
  ensureFinalNewline: true,
  quoteStyle: 'double',
  maxLineLength: 80
}
