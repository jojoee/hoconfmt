# hoconfmt

Opinionated HOCON formatter - zero configuration, one way to format.

[![npm version](https://badge.fury.io/js/hoconfmt.svg)](https://badge.fury.io/js/hoconfmt)
[![continuous integration](https://github.com/jojoee/hoconfmt/actions/workflows/continuous-integration.yml/badge.svg)](https://github.com/jojoee/hoconfmt/actions/workflows/continuous-integration.yml)
[![codecov](https://codecov.io/gh/jojoee/hoconfmt/branch/main/graph/badge.svg)](https://codecov.io/gh/jojoee/hoconfmt)

## Philosophy

Like [Standard.js](https://standardjs.com/) for JavaScript - no configuration, no debates. One way to format HOCON files.

## Installation

```bash
# npm
npm install hoconfmt

# yarn
yarn add hoconfmt

# pnpm
pnpm add hoconfmt

# global install for CLI
npm install -g hoconfmt
```

## Usage

### CLI

```bash
# Check if files are formatted (default mode)
hoconfmt file.conf

# Check multiple files
hoconfmt "src/**/*.conf"

# Check all .conf files in directory
hoconfmt src/

# Show help
hoconfmt --help

# Show version
hoconfmt --version
```

Exit codes:
- `0` - All files are formatted correctly
- `1` - Some files need formatting or errors occurred

### API

```typescript
import { check, format } from 'hoconfmt';

// Check if HOCON string is formatted correctly
const isFormatted = check('key = "value"');
console.log(isFormatted); // true or false

// Format HOCON string
const formatted = format('key="value"');
console.log(formatted); // 'key = "value"\n'
```

### CommonJS

```javascript
const { check, format } = require('hoconfmt');

const formatted = format('key = "value"');
```

### Browser (UMD)

```html
<script src="https://unpkg.com/hoconfmt/dist/hoconfmt.umd.js"></script>
<script>
  const formatted = hoconfmt.format('key = "value"');
</script>
```

### Docker

```bash
# Check a file
docker run --rm -v $(pwd):/data ghcr.io/jojoee/hoconfmt /data/file.conf

# Check all .conf files in a directory
docker run --rm -v $(pwd):/data ghcr.io/jojoee/hoconfmt /data/
```

## Formatting Rules

These rules are **not configurable** - that's the point!

| Rule | Value |
|------|-------|
| Indentation | 2 spaces |
| Key-value separator | `=` with spaces (`key = value`) |
| Brace style | Same line (`key {`) |
| Comments | Normalized to `//` style |
| Trailing whitespace | Removed |
| Blank lines | Multiple collapsed to single |
| End of file | Single newline |
| String quotes | Double quotes |
| Array style | Single line if < 80 chars |

### Before

```hocon
# Database config
database{
host="localhost"
port=5432
  pool {
    min=1
    max=10
  }
}
```

### After

```hocon
// Database config
database = {
  host = "localhost"
  port = 5432
  pool = {
    min = 1
    max = 10
  }
}
```

## API Reference

### `check(input: string): boolean`

Check if a HOCON string is formatted correctly.

```typescript
check('key = "value"\n');  // true
check('key="value"');      // false (missing spaces)
```

### `format(input: string): string`

Format a HOCON string according to the opinionated rules.

```typescript
format('key="value"');
// Returns: 'key = "value"\n'
```

## HOCON Features Supported

- Key-value pairs with `=` or `:`
- Nested objects with `{}`
- Arrays with `[]`
- Comments (`//` and `#`)
- Include statements
- Variable substitution (`${path}` and `${?path}`)
- Triple-quoted strings (`"""..."""`)
- Concatenation
- Dotted key paths (`server.host = "localhost"`)

## Integration

### Pre-commit Hook

```bash
# .husky/pre-commit
npx hoconfmt "src/**/*.conf"
```

### VS Code Task

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Check HOCON",
      "type": "shell",
      "command": "npx hoconfmt src/"
    }
  ]
}
```

### CI/CD

```yaml
# GitHub Actions
- name: Check HOCON formatting
  run: npx hoconfmt "src/**/*.conf"
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build

# Lint
npm run lint
```

## License

MIT

## Author

Nathachai Thongniran

## Related

- [HOCON Specification](https://github.com/lightbend/config/blob/main/HOCON.md)
- [pyhocon](https://github.com/chimpler/pyhocon) - Python HOCON parser
- [Standard.js](https://standardjs.com/) - Inspiration for zero-config philosophy
