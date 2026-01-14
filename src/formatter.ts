import type {
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
  ConcatenationNode,
  FormatterOptions
} from './types.js'
import { DEFAULT_OPTIONS } from './types.js'

/**
 * HOCON Formatter - Converts AST back to formatted string
 * Applies opinionated formatting rules
 */
export class Formatter {
  private readonly options: FormatterOptions
  private output: string = ''
  private indentLevel: number = 0

  constructor (options: FormatterOptions = DEFAULT_OPTIONS) {
    this.options = options
  }

  /**
   * Format AST to string
   */
  format (ast: DocumentNode): string {
    this.output = ''
    this.indentLevel = 0

    this.formatDocument(ast)

    // Ensure final newline
    if (this.options.ensureFinalNewline && !this.output.endsWith('\n')) {
      this.output += '\n'
    }

    // Collapse multiple blank lines
    if (this.options.collapseBlankLines) {
      this.output = this.output.replace(/\n{3,}/g, '\n\n')
    }

    return this.output
  }

  private formatDocument (doc: DocumentNode): void {
    for (let i = 0; i < doc.body.length; i++) {
      const node = doc.body[i]
      if (node === undefined) continue
      const isFirst = i === 0

      // Add blank line if node has preceding blank lines (collapse to max 1)
      if (!isFirst && node.precedingBlankLines !== undefined && node.precedingBlankLines > 0) {
        this.output += '\n'
      }

      this.formatRootElement(node)
      this.output += '\n'
    }
  }

  private formatRootElement (node: FieldNode | IncludeNode | CommentNode): void {
    // Format leading comments
    if (node.leadingComments != null) {
      for (const comment of node.leadingComments) {
        this.formatComment(comment)
        this.output += '\n'
      }
    }

    if (node.type === 'Include') {
      this.formatInclude(node)
    } else if (node.type === 'Field') {
      this.formatField(node)
    } else if (node.type === 'Comment') {
      this.formatComment(node)
    }
  }

  private formatInclude (node: IncludeNode): void {
    this.writeIndent()
    this.output += 'include '

    if (node.required) {
      this.output += 'required('
    }

    if (node.kind !== 'file') {
      this.output += `${node.kind}(`
    }

    this.output += `"${this.escapeString(node.path)}"`

    if (node.kind !== 'file') {
      this.output += ')'
    }

    if (node.required) {
      this.output += ')'
    }
  }

  private formatField (node: FieldNode): void {
    this.writeIndent()
    this.formatKey(node.key)
    this.output += this.options.keyValueSeparator
    this.formatValue(node.value)

    // Trailing comment
    if (node.trailingComment != null) {
      this.output += ' '
      this.formatComment(node.trailingComment)
    }
  }

  private formatKey (node: KeyNode): void {
    // For keys with dots, keep them as path notation
    if (node.parts.length === 1) {
      const key = node.parts[0]
      if (key === undefined) return
      if (this.needsQuoting(key)) {
        this.output += `"${this.escapeString(key)}"`
      } else {
        this.output += key
      }
    } else {
      // Multiple parts - use dot notation
      this.output += node.parts.map(part => {
        if (this.needsQuoting(part)) {
          return `"${this.escapeString(part)}"`
        }
        return part
      }).join('.')
    }
  }

  private formatValue (node: ValueNode): void {
    switch (node.type) {
      case 'String':
        this.formatString(node)
        break
      case 'Number':
        this.formatNumber(node)
        break
      case 'Boolean':
        this.formatBoolean(node)
        break
      case 'Null':
        this.formatNull(node)
        break
      case 'Object':
        this.formatObject(node)
        break
      case 'Array':
        this.formatArray(node)
        break
      case 'Substitution':
        this.formatSubstitution(node)
        break
      case 'Concatenation':
        this.formatConcatenation(node)
        break
    }
  }

  private formatString (node: StringNode): void {
    if (node.multiline) {
      // Preserve multiline strings as-is
      this.output += `"""${node.value}"""`
    } else {
      // Always use double quotes per our opinionated rules
      this.output += `"${this.escapeString(node.value)}"`
    }
  }

  private formatNumber (node: NumberNode): void {
    this.output += node.raw
  }

  private formatBoolean (node: BooleanNode): void {
    this.output += node.value ? 'true' : 'false'
  }

  private formatNull (_node: NullNode): void {
    this.output += 'null'
  }

  private formatObject (node: ObjectNode): void {
    if (node.fields.length === 0) {
      this.output += '{}'
      return
    }

    this.output += '{'
    this.output += '\n'
    this.indentLevel++

    for (let i = 0; i < node.fields.length; i++) {
      const field = node.fields[i]
      if (field === undefined) continue
      const isFirst = i === 0

      // Add blank line if field has preceding blank lines (collapse to max 1)
      if (!isFirst && field.precedingBlankLines !== undefined && field.precedingBlankLines > 0) {
        this.output += '\n'
      }

      this.formatRootElement(field)
      this.output += '\n'
    }

    this.indentLevel--
    this.writeIndent()
    this.output += '}'
  }

  private formatArray (node: ArrayNode): void {
    if (node.elements.length === 0) {
      this.output += '[]'
      return
    }

    // Check if array can fit on single line
    const singleLine = this.canArrayFitOnLine(node)

    if (singleLine) {
      this.output += '['
      for (let i = 0; i < node.elements.length; i++) {
        if (i > 0) {
          this.output += ', '
        }
        const element = node.elements[i]
        if (element === undefined) continue
        if (element.type === 'Comment') {
          this.formatComment(element)
        } else {
          this.formatValue(element)
        }
      }
      this.output += ']'
    } else {
      this.output += '['
      this.output += '\n'
      this.indentLevel++

      for (let i = 0; i < node.elements.length; i++) {
        const element = node.elements[i]
        if (element === undefined) continue
        this.writeIndent()

        if (element.type === 'Comment') {
          this.formatComment(element)
        } else {
          this.formatValue(element)
        }

        this.output += '\n'
      }

      this.indentLevel--
      this.writeIndent()
      this.output += ']'
    }
  }

  private formatSubstitution (node: SubstitutionNode): void {
    if (node.optional) {
      this.output += `\${?${node.path}}`
    } else {
      this.output += `\${${node.path}}`
    }
  }

  private formatConcatenation (node: ConcatenationNode): void {
    for (let i = 0; i < node.parts.length; i++) {
      const currPart = node.parts[i]
      if (currPart === undefined) continue

      if (i > 0) {
        // Add space between concatenated parts if needed
        const prevPart = node.parts[i - 1]

        // Don't add space before/after substitutions in some cases
        if (prevPart !== undefined && prevPart.type !== 'Substitution' && currPart.type !== 'Substitution') {
          this.output += ' '
        }
      }
      this.formatValue(currPart)
    }
  }

  private formatComment (node: CommentNode): void {
    // Normalize to // style
    const commentStyle = this.options.normalizeComments === 'preserve'
      ? node.style
      : this.options.normalizeComments

    this.output += `${commentStyle}${node.value}`
  }

  private canArrayFitOnLine (node: ArrayNode): boolean {
    // Check if array has comments - if so, use multiline
    for (const element of node.elements) {
      if (element.type === 'Comment') {
        return false
      }
    }

    // Estimate line length
    let estimatedLength = 2 // []
    for (let i = 0; i < node.elements.length; i++) {
      if (i > 0) {
        estimatedLength += 2 // ", "
      }
      const element = node.elements[i]
      if (element !== undefined) {
        estimatedLength += this.estimateValueLength(element)
      }
    }

    return estimatedLength < this.options.maxLineLength
  }

  private estimateValueLength (node: ValueNode | CommentNode): number {
    if (node.type === 'Comment') {
      return 100 // Force multiline for comments
    }

    switch (node.type) {
      case 'String':
        return node.value.length + 2
      case 'Number':
        return node.raw.length
      case 'Boolean':
        return node.value ? 4 : 5
      case 'Null':
        return 4
      case 'Substitution':
        return node.raw.length
      case 'Object':
        return 100 // Objects always multiline
      case 'Array':
        return 100 // Nested arrays go multiline
      case 'Concatenation':
        return node.parts.reduce((sum, part) => sum + this.estimateValueLength(part), 0)
      default:
        return 10
    }
  }

  private needsQuoting (str: string): boolean {
    // Check if string needs quoting
    if (str.length === 0) {
      return true
    }

    // Keywords need quoting
    if (str === 'true' || str === 'false' || str === 'null' || str === 'include') {
      return true
    }

    // Check for special characters
    return !/^[a-zA-Z0-9_\-.]+$/.test(str)
  }

  private escapeString (str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  }

  private writeIndent (): void {
    const indent = this.options.indentChar.repeat(this.options.indentSize * this.indentLevel)
    this.output += indent
  }
}

/**
 * Format HOCON AST to string
 */
export function formatAst (ast: DocumentNode, options?: FormatterOptions): string {
  const formatter = new Formatter(options)
  return formatter.format(ast)
}
