import { describe, it, expect } from 'vitest';
import { tokenize } from '../src/lexer.js';
import { TokenType } from '../src/types.js';

describe('Lexer', () => {
  describe('basic tokens', () => {
    it('should tokenize simple key-value pair', () => {
      const tokens = tokenize('key = "value"');
      const types = tokens.map(t => t.type);

      expect(types).toContain(TokenType.Key);
      expect(types).toContain(TokenType.Equals);
      expect(types).toContain(TokenType.String);
      expect(types).toContain(TokenType.EOF);
    });

    it('should tokenize braces', () => {
      const tokens = tokenize('{}');

      expect(tokens[0]?.type).toBe(TokenType.LeftBrace);
      expect(tokens[1]?.type).toBe(TokenType.RightBrace);
    });

    it('should tokenize brackets', () => {
      const tokens = tokenize('[]');

      expect(tokens[0]?.type).toBe(TokenType.LeftBracket);
      expect(tokens[1]?.type).toBe(TokenType.RightBracket);
    });

    it('should tokenize colon separator', () => {
      const tokens = tokenize('key: value');
      const types = tokens.map(t => t.type);

      expect(types).toContain(TokenType.Colon);
    });
  });

  describe('comments', () => {
    it('should tokenize // comments', () => {
      const tokens = tokenize('// this is a comment');

      expect(tokens[0]?.type).toBe(TokenType.Comment);
      expect(tokens[0]?.value).toBe(' this is a comment');
    });

    it('should tokenize # comments', () => {
      const tokens = tokenize('# this is a comment');

      expect(tokens[0]?.type).toBe(TokenType.Comment);
      expect(tokens[0]?.value).toBe(' this is a comment');
    });

    it('should preserve comment style in raw', () => {
      const slashTokens = tokenize('// comment');
      const hashTokens = tokenize('# comment');

      expect(slashTokens[0]?.raw).toMatch(/^\/\//);
      expect(hashTokens[0]?.raw).toMatch(/^#/);
    });
  });

  describe('strings', () => {
    it('should tokenize quoted strings', () => {
      const tokens = tokenize('"hello world"');

      expect(tokens[0]?.type).toBe(TokenType.String);
      expect(tokens[0]?.value).toBe('hello world');
    });

    it('should handle escaped characters', () => {
      const tokens = tokenize('"hello\\nworld"');

      expect(tokens[0]?.type).toBe(TokenType.String);
      expect(tokens[0]?.value).toBe('hello\nworld');
    });

    it('should tokenize triple-quoted strings', () => {
      const tokens = tokenize('"""multiline\nstring"""');

      expect(tokens[0]?.type).toBe(TokenType.MultilineString);
      expect(tokens[0]?.value).toContain('\n');
    });
  });

  describe('numbers', () => {
    it('should tokenize integers', () => {
      const tokens = tokenize('42');

      expect(tokens[0]?.type).toBe(TokenType.Number);
      expect(tokens[0]?.value).toBe('42');
    });

    it('should tokenize floats', () => {
      const tokens = tokenize('3.14');

      expect(tokens[0]?.type).toBe(TokenType.Number);
      expect(tokens[0]?.value).toBe('3.14');
    });

    it('should tokenize negative numbers', () => {
      const tokens = tokenize('-10');

      expect(tokens[0]?.type).toBe(TokenType.Number);
      expect(tokens[0]?.value).toBe('-10');
    });
  });

  describe('booleans and null', () => {
    it('should tokenize true', () => {
      const tokens = tokenize('true');

      expect(tokens[0]?.type).toBe(TokenType.Boolean);
      expect(tokens[0]?.value).toBe('true');
    });

    it('should tokenize false', () => {
      const tokens = tokenize('false');

      expect(tokens[0]?.type).toBe(TokenType.Boolean);
      expect(tokens[0]?.value).toBe('false');
    });

    it('should tokenize null', () => {
      const tokens = tokenize('null');

      expect(tokens[0]?.type).toBe(TokenType.Null);
    });
  });

  describe('substitutions', () => {
    it('should tokenize ${path}', () => {
      const tokens = tokenize('${some.path}');

      expect(tokens[0]?.type).toBe(TokenType.Substitution);
      expect(tokens[0]?.value).toBe('some.path');
    });

    it('should tokenize ${?path} optional substitution', () => {
      const tokens = tokenize('${?optional.path}');

      expect(tokens[0]?.type).toBe(TokenType.Substitution);
      expect(tokens[0]?.value).toBe('optional.path');
      expect(tokens[0]?.raw).toContain('?');
    });
  });

  describe('include', () => {
    it('should tokenize include keyword', () => {
      const tokens = tokenize('include "file.conf"');
      const types = tokens.map(t => t.type);

      expect(types).toContain(TokenType.Include);
      expect(types).toContain(TokenType.String);
    });
  });

  describe('complex input', () => {
    it('should tokenize object with nested values', () => {
      const input = `
        server {
          host = "localhost"
          port = 8080
        }
      `;

      const tokens = tokenize(input);
      const types = tokens.map(t => t.type);

      expect(types).toContain(TokenType.Key);
      expect(types).toContain(TokenType.LeftBrace);
      expect(types).toContain(TokenType.RightBrace);
      expect(types).toContain(TokenType.String);
      expect(types).toContain(TokenType.Number);
    });
  });
});
