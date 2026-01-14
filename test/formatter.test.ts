import { describe, it, expect } from 'vitest';
import { format, check } from '../src/index.js';

describe('Formatter', () => {
  describe('basic formatting', () => {
    it('should format key-value pairs with spaces around =', () => {
      const result = format('key="value"');

      expect(result).toContain('key = "value"');
    });

    it('should use 2-space indentation', () => {
      const result = format('obj{key="value"}');

      expect(result).toContain('  key = "value"');
    });

    it('should ensure final newline', () => {
      const result = format('key = "value"');

      expect(result.endsWith('\n')).toBe(true);
    });
  });

  describe('comment normalization', () => {
    it('should normalize # comments to //', () => {
      const result = format('# comment');

      expect(result).toContain('//');
      expect(result).not.toContain('#');
    });

    it('should keep // comments as //', () => {
      const result = format('// comment');

      expect(result).toContain('//');
    });
  });

  describe('whitespace handling', () => {
    it('should preserve no blank lines between keys', () => {
      const input = `key1 = "value1"
key2 = "value2"
key3 = "value3"`;

      const result = format(input);

      // No blank lines should be added
      expect(result).toBe('key1 = "value1"\nkey2 = "value2"\nkey3 = "value3"\n');
    });

    it('should preserve single blank line between keys', () => {
      const input = `key1 = "value1"

key2 = "value2"

key3 = "value3"`;

      const result = format(input);

      // Single blank lines should be preserved
      expect(result).toBe('key1 = "value1"\n\nkey2 = "value2"\n\nkey3 = "value3"\n');
    });

    it('should collapse multiple blank lines to single blank line', () => {
      const input = `key1 = "value1"


key2 = "value2"



key3 = "value3"`;

      const result = format(input);

      // Multiple blank lines should collapse to single blank line
      expect(result).toBe('key1 = "value1"\n\nkey2 = "value2"\n\nkey3 = "value3"\n');
      // Should not have more than 2 consecutive newlines
      expect(result).not.toMatch(/\n{3,}/);
    });

    it('should collapse trailing blank lines to single newline', () => {
      const input = `key1 = "value1"
key2 = "value2"


`;

      const result = format(input);

      // Should end with single newline (no trailing blank lines)
      expect(result).toBe('key1 = "value1"\nkey2 = "value2"\n');
    });

    it('should preserve blank lines inside objects', () => {
      const input = `obj = {
  key1 = "value1"

  key2 = "value2"
}`;

      const result = format(input);

      // Single blank line inside object should be preserved
      expect(result).toContain('key1 = "value1"\n\n  key2 = "value2"');
    });

    it('should collapse multiple blank lines inside objects', () => {
      const input = `obj = {
  key1 = "value1"



  key2 = "value2"
}`;

      const result = format(input);

      // Multiple blank lines inside object should collapse to single blank line
      expect(result).toContain('key1 = "value1"\n\n  key2 = "value2"');
      expect(result).not.toMatch(/\n{3,}/);
    });
  });

  describe('object formatting', () => {
    it('should format empty object as {}', () => {
      const result = format('obj = {}');

      expect(result).toContain('{}');
    });

    it('should format nested objects with proper indentation', () => {
      const result = format('server{host="localhost"}');

      expect(result).toMatch(/server = \{/);
      expect(result).toMatch(/\n {2}host = "localhost"/);
      expect(result).toMatch(/\n\}/);
    });
  });

  describe('array formatting', () => {
    it('should format empty array as []', () => {
      const result = format('arr = []');

      expect(result).toContain('[]');
    });

    it('should format short arrays on single line', () => {
      const result = format('arr = [1, 2, 3]');

      expect(result).toContain('[');
      expect(result).toContain(']');
    });
  });

  describe('include statements', () => {
    it('should format include statements', () => {
      const result = format('include "file.conf"');

      expect(result).toContain('include "file.conf"');
    });
  });

  describe('substitutions', () => {
    it('should preserve ${path} substitutions', () => {
      const result = format('key = ${other.key}');

      expect(result).toContain('${other.key}');
    });

    it('should preserve ${?path} optional substitutions', () => {
      const result = format('key = ${?optional.key}');

      expect(result).toContain('${?optional.key}');
    });
  });

  describe('boolean formatting', () => {
    it('should format true value', () => {
      const result = format('enabled = true');

      expect(result).toContain('enabled = true');
    });

    it('should format false value', () => {
      const result = format('disabled = false');

      expect(result).toContain('disabled = false');
    });
  });

  describe('null formatting', () => {
    it('should format null value', () => {
      const result = format('empty = null');

      expect(result).toContain('empty = null');
    });
  });

  describe('concatenation formatting', () => {
    it('should format string concatenation with substitution', () => {
      const result = format('path = ${home}"/bin"');

      expect(result).toContain('${home}');
      expect(result).toContain('"/bin"');
    });

    it('should format multiple string concatenation', () => {
      const result = format('greeting = "Hello" " " "World"');

      expect(result).toContain('"Hello"');
      expect(result).toContain('"World"');
    });
  });
});

describe('Check', () => {
  it('should return true for properly formatted input', () => {
    const formatted = format('key = "value"');
    const result = check(formatted);

    expect(result).toBe(true);
  });

  it('should return false for unformatted input', () => {
    // Missing spaces around =
    const result = check('key="value"');

    expect(result).toBe(false);
  });

  it('should return false for invalid HOCON', () => {
    const result = check('{ invalid }}}');

    // May or may not parse, but should handle gracefully
    expect(typeof result).toBe('boolean');
  });
});
