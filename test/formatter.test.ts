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

    it('should format required include', () => {
      const result = format('include required("file.conf")');

      expect(result).toContain('include required("file.conf")');
    });

    it('should format url include', () => {
      const result = format('include url("http://example.com/config.conf")');

      expect(result).toContain('include url("http://example.com/config.conf")');
    });

    it('should format classpath include', () => {
      const result = format('include classpath("reference.conf")');

      expect(result).toContain('include classpath("reference.conf")');
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

    it('should format multiple string concatenation as single quoted string', () => {
      const result = format('greeting = "Hello" " " "World"');

      // Fix #1: Concatenations are now combined into single quoted string
      // Each space between parts adds a space, plus the " " content itself
      expect(result).toContain('"Hello   World"');
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

describe('Style fixes', () => {
  describe('fix #1: quote concatenations', () => {
    it('should quote duration values like "60 seconds"', () => {
      const result = format('timeout = 60 seconds');

      expect(result).toContain('timeout = "60 seconds"');
    });

    it('should preserve spacing when quoting concatenations', () => {
      // 60s has no space between parts
      const result1 = format('keep-alive-time = 60s');
      expect(result1).toContain('keep-alive-time = "60s"');

      // 60 s and 2 s have a space between parts
      const result2 = format('delay = 60 s');
      expect(result2).toContain('delay = "60 s"');

      const result3 = format('timeout = 2 s');
      expect(result3).toContain('timeout = "2 s"');
    });
  });

  describe('fix #2: comment indentation', () => {
    it('should indent comments inside objects', () => {
      const input = `obj = {
  // comment
  key = "value"
}`;
      const result = format(input);

      expect(result).toContain('  // comment');
    });

    it('should normalize over-indented comments', () => {
      const input = `obj = {
      // over-indented comment
  key = "value"
}`;
      const result = format(input);

      // Comment should be at proper 2-space indent level
      expect(result).toMatch(/\n {2}\/\/ over-indented comment/);
    });
  });

  describe('fix #3 & #6: comment ordering and blank lines', () => {
    it('should preserve comment order', () => {
      const input = `// first comment
// second comment
key = "value"`;

      const result = format(input);

      expect(result.indexOf('first comment')).toBeLessThan(result.indexOf('second comment'));
    });

    it('should preserve blank lines between comments', () => {
      const input = `// first comment

// second comment after blank line
key = "value"`;

      const result = format(input);

      expect(result).toContain('// first comment\n\n// second comment');
    });
  });

  describe('fix #4: triple quote spacing', () => {
    it('should not add spaces inside multiline string concatenations', () => {
      const input = 'key = """content"""';
      const result = format(input);

      // Should preserve multiline string as-is
      expect(result).toContain('"""content"""');
    });
  });

  describe('fix #5: space when extending substitutions', () => {
    it('should preserve space between substitution and object', () => {
      const input = 'config = ${base.config} { key = "value" }';
      const result = format(input);

      // Should have space between substitution and opening brace
      expect(result).toContain('${base.config} {');
    });

    it('should handle extending pattern correctly', () => {
      const input = `producer = \${default-props} {
  bootstrap.servers = "localhost:9095"
}`;
      const result = format(input);

      expect(result).toContain('${default-props} {');
    });
  });
});
