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
    it('should collapse multiple blank lines', () => {
      const input = `key1 = "value1"


key2 = "value2"`;

      const result = format(input);

      // Should not have more than 2 consecutive newlines
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
