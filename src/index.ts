/**
 * hoconfmt - Opinionated HOCON Formatter
 *
 * Zero configuration, one way to format.
 * Similar to standard.js - no debates about formatting rules.
 *
 * @example
 * ```typescript
 * import { check, format } from 'hoconfmt';
 *
 * // Check if HOCON is formatted correctly
 * const isFormatted = check(hoconString);
 *
 * // Format HOCON string
 * const formatted = format(hoconString);
 * ```
 */

import { parse } from './parser.js';
import { formatAst } from './formatter.js';

/**
 * Check if HOCON string is formatted correctly
 *
 * @param input - HOCON source string
 * @returns true if input is already formatted correctly, false otherwise
 *
 * @example
 * ```typescript
 * const isFormatted = check('key = "value"\n');
 * // Returns true if properly formatted
 * ```
 */
export function check(input: string): boolean {
  try {
    const formatted = format(input);
    return input === formatted;
  } catch {
    // If parsing fails, it's not properly formatted
    return false;
  }
}

/**
 * Format HOCON string according to opinionated rules
 *
 * Formatting rules (not configurable):
 * - 2 spaces for indentation
 * - `=` with spaces for key-value separator (key = value)
 * - Opening brace on same line (key {)
 * - Comments normalized to // style
 * - Trailing whitespace removed
 * - Multiple blank lines collapsed to single
 * - Single newline at end of file
 * - Double quotes for all strings
 * - Smart array formatting (single line if < 80 chars)
 *
 * @param input - HOCON source string
 * @returns Formatted HOCON string
 * @throws Error if input is not valid HOCON
 *
 * @example
 * ```typescript
 * const formatted = format('key="value"');
 * // Returns: 'key = "value"\n'
 * ```
 */
export function format(input: string): string {
  const ast = parse(input);
  return formatAst(ast);
}

// Re-export types for TypeScript users
export type {
  Token,
  Position,
  Location,
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
} from './types.js';

export { TokenType } from './types.js';

// Re-export low-level functions for advanced use
export { tokenize } from './lexer.js';
export { parse } from './parser.js';
export { formatAst } from './formatter.js';
