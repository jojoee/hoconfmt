import { describe, it, expect } from 'vitest';
import { parse } from '../src/parser.js';

describe('Parser', () => {
  describe('basic parsing', () => {
    it('should parse empty document', () => {
      const ast = parse('');

      expect(ast.type).toBe('Document');
      expect(ast.body).toHaveLength(0);
    });

    it('should parse simple key-value pair', () => {
      const ast = parse('key = "value"');

      expect(ast.body).toHaveLength(1);
      expect(ast.body[0]?.type).toBe('Field');

      const field = ast.body[0] as { key: { parts: string[] }; value: { value: string } };
      expect(field.key.parts).toEqual(['key']);
      expect(field.value.value).toBe('value');
    });

    it('should parse dotted key path', () => {
      const ast = parse('server.host = "localhost"');

      expect(ast.body).toHaveLength(1);

      const field = ast.body[0] as { key: { parts: string[] } };
      expect(field.key.parts).toEqual(['server', 'host']);
    });
  });

  describe('include statements', () => {
    it('should parse simple include', () => {
      const ast = parse('include "file.conf"');

      expect(ast.body).toHaveLength(1);
      expect(ast.body[0]?.type).toBe('Include');

      const include = ast.body[0] as { path: string; required: boolean };
      expect(include.path).toBe('file.conf');
      expect(include.required).toBe(false);
    });

    it('should parse required include', () => {
      const ast = parse('include required("file.conf")');

      expect(ast.body).toHaveLength(1);
      expect(ast.body[0]?.type).toBe('Include');

      const include = ast.body[0] as { path: string; required: boolean; kind: string };
      expect(include.path).toBe('file.conf');
      expect(include.required).toBe(true);
    });

    it('should parse url include', () => {
      const ast = parse('include url("http://example.com/config.conf")');

      expect(ast.body).toHaveLength(1);
      expect(ast.body[0]?.type).toBe('Include');

      const include = ast.body[0] as { path: string; kind: string };
      expect(include.path).toBe('http://example.com/config.conf');
      expect(include.kind).toBe('url');
    });

    it('should parse classpath include', () => {
      const ast = parse('include classpath("reference.conf")');

      expect(ast.body).toHaveLength(1);
      expect(ast.body[0]?.type).toBe('Include');

      const include = ast.body[0] as { path: string; kind: string };
      expect(include.path).toBe('reference.conf');
      expect(include.kind).toBe('classpath');
    });

    it('should parse file include', () => {
      const ast = parse('include file("local.conf")');

      expect(ast.body).toHaveLength(1);
      expect(ast.body[0]?.type).toBe('Include');

      const include = ast.body[0] as { path: string; kind: string };
      expect(include.path).toBe('local.conf');
      expect(include.kind).toBe('file');
    });
  });

  describe('comments', () => {
    it('should parse // comments', () => {
      const ast = parse('// this is a comment');

      expect(ast.body).toHaveLength(1);
      expect(ast.body[0]?.type).toBe('Comment');

      const comment = ast.body[0] as { style: string; value: string };
      expect(comment.style).toBe('//');
    });

    it('should parse # comments', () => {
      const ast = parse('# this is a comment');

      expect(ast.body).toHaveLength(1);
      expect(ast.body[0]?.type).toBe('Comment');

      const comment = ast.body[0] as { style: string };
      expect(comment.style).toBe('#');
    });

    it('should attach leading comments to fields', () => {
      const ast = parse(`
// comment
key = "value"
      `);

      const field = ast.body.find(n => n.type === 'Field');
      expect(field?.leadingComments).toHaveLength(1);
    });
  });

  describe('objects', () => {
    it('should parse empty object', () => {
      const ast = parse('obj = {}');

      expect(ast.body).toHaveLength(1);

      const field = ast.body[0] as { value: { type: string; fields: unknown[] } };
      expect(field.value.type).toBe('Object');
      expect(field.value.fields).toHaveLength(0);
    });

    it('should parse nested object', () => {
      const ast = parse(`
server {
  host = "localhost"
  port = 8080
}
      `);

      expect(ast.body).toHaveLength(1);

      const field = ast.body[0] as { value: { type: string; fields: unknown[] } };
      expect(field.value.type).toBe('Object');
      expect(field.value.fields).toHaveLength(2);
    });
  });

  describe('arrays', () => {
    it('should parse empty array', () => {
      const ast = parse('arr = []');

      const field = ast.body[0] as { value: { type: string; elements: unknown[] } };
      expect(field.value.type).toBe('Array');
      expect(field.value.elements).toHaveLength(0);
    });

    it('should parse array with elements', () => {
      const ast = parse('arr = [1, 2, 3]');

      const field = ast.body[0] as { value: { type: string; elements: unknown[] } };
      expect(field.value.type).toBe('Array');
      expect(field.value.elements).toHaveLength(3);
    });
  });

  describe('substitutions', () => {
    it('should parse ${path} substitution', () => {
      const ast = parse('key = ${other.key}');

      const field = ast.body[0] as { value: { type: string; path: string; optional: boolean } };
      expect(field.value.type).toBe('Substitution');
      expect(field.value.path).toBe('other.key');
      expect(field.value.optional).toBe(false);
    });

    it('should parse ${?path} optional substitution', () => {
      const ast = parse('key = ${?optional.key}');

      const field = ast.body[0] as { value: { type: string; path: string; optional: boolean } };
      expect(field.value.type).toBe('Substitution');
      expect(field.value.optional).toBe(true);
    });
  });

  describe('values', () => {
    it('should parse string values', () => {
      const ast = parse('key = "hello"');

      const field = ast.body[0] as { value: { type: string; value: string } };
      expect(field.value.type).toBe('String');
      expect(field.value.value).toBe('hello');
    });

    it('should parse number values', () => {
      const ast = parse('key = 42');

      const field = ast.body[0] as { value: { type: string; value: number } };
      expect(field.value.type).toBe('Number');
      expect(field.value.value).toBe(42);
    });

    it('should parse boolean values', () => {
      const ast = parse('enabled = true');

      const field = ast.body[0] as { value: { type: string; value: boolean } };
      expect(field.value.type).toBe('Boolean');
      expect(field.value.value).toBe(true);
    });

    it('should parse null value', () => {
      const ast = parse('key = null');

      const field = ast.body[0] as { value: { type: string } };
      expect(field.value.type).toBe('Null');
    });

    it('should parse multiline string values', () => {
      const ast = parse('key = """line1\nline2\nline3"""');

      const field = ast.body[0] as { value: { type: string; value: string; multiline: boolean } };
      expect(field.value.type).toBe('String');
      expect(field.value.multiline).toBe(true);
      expect(field.value.value).toContain('line1');
    });

    it('should parse unquoted string values', () => {
      const ast = parse('key = unquoted-value');

      const field = ast.body[0] as { value: { type: string; value: string } };
      expect(field.value.type).toBe('String');
      expect(field.value.value).toBe('unquoted-value');
    });
  });

  describe('blank line tracking', () => {
    it('should track precedingBlankLines with multiple comments', () => {
      const input = `obj = "value1"

// comment1
// comment2

field = "value2"`;

      const ast = parse(input);

      expect(ast.body).toHaveLength(2);

      const field = ast.body[1];
      expect(field?.type).toBe('Field');
      expect(field?.leadingComments).toHaveLength(2);
      expect(field?.leadingComments?.[0]?.precedingBlankLines).toBe(1);
      expect(field?.precedingBlankLines).toBe(1);
    });

    it('should track precedingBlankLines with object values', () => {
      const input = `obj = {
  key1 = "value1"
}

// the default dispatcher is bounded by 16 threads
// fixed-pool-size = 16

field = {
  key2 = "value2"
}`;

      const ast = parse(input);

      expect(ast.body).toHaveLength(2);

      const field = ast.body[1];
      expect(field?.type).toBe('Field');
      expect(field?.leadingComments).toHaveLength(2);
      expect(field?.leadingComments?.[0]?.precedingBlankLines).toBe(1);
      expect(field?.precedingBlankLines).toBe(1);
    });
  });
});
