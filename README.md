# hoconfmt

Opinionated HOCON formatter - zero configuration, one way to format.

[![npm version](https://badge.fury.io/js/hoconfmt.svg)](https://badge.fury.io/js/hoconfmt)
[![Download - npm](https://img.shields.io/npm/dt/hoconfmt.svg)](https://www.npmjs.com/package/hoconfmt)
[![License - npm](https://img.shields.io/npm/l/hoconfmt.svg)](http://opensource.org/licenses/MIT)
[![install size](https://packagephobia.com/badge?p=hoconfmt)](https://packagephobia.com/result?p=hoconfmt)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)](https://github.com/semantic-release/semantic-release)

[![continuous integration](https://github.com/jojoee/hoconfmt/actions/workflows/continuous-integration.yml/badge.svg)](https://github.com/jojoee/hoconfmt/actions/workflows/continuous-integration.yml)
[![release](https://github.com/jojoee/hoconfmt/actions/workflows/release.yml/badge.svg)](https://github.com/jojoee/hoconfmt/actions/workflows/release.yml)
[![runnable](https://github.com/jojoee/hoconfmt/actions/workflows/runnable.yml/badge.svg)](https://github.com/jojoee/hoconfmt/actions/workflows/runnable.yml)
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

Requires Node.js >= 24.0.0

## Usage

### CLI

```bash
# Check if files are formatted (validates without modifying)
hoconfmt --check file.conf

# Check multiple files
hoconfmt --check "src/**/*.conf"

# Check all .conf files in directory
hoconfmt --check src/

# Format files in-place (overwrites)
hoconfmt --write file.conf

# Format all .conf files in directory
hoconfmt --write src/

# Show help
hoconfmt --help

# Show version
hoconfmt --version
```

Exit codes:
- `0` - All files are formatted correctly (check) or formatted successfully (write)
- `1` - Some files need formatting, errors occurred, or no mode specified

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
docker run --rm -v $(pwd):/data ghcr.io/jojoee/hoconfmt --check /data/file.conf

# Check all .conf files in a directory
docker run --rm -v $(pwd):/data ghcr.io/jojoee/hoconfmt --check /data/

# Format a file
docker run --rm -v $(pwd):/data ghcr.io/jojoee/hoconfmt --write /data/file.conf
```

## Formatting Rules

These rules are **not configurable** - that's the point!

| Rule | Value |
|------|-------|
| Indentation | 2 spaces |
| Key-value separator | `=` with spaces (`key = value`) |
| Brace style | Same line (`key {`) |
| Comments | Normalized to `//` style, indented to match scope |
| Trailing whitespace | Removed |
| Blank lines | Preserved (max 1 between elements and comments) |
| End of file | Single newline |
| String quotes | Double quotes |
| Array style | Single line if < 80 chars |
| Value concatenation | Combined into single quoted string (`60 seconds` → `"60 seconds"`) |
| Substitution extension | Space preserved (`${ref} { }`) |
| Triple-quoted strings | Content preserved without extra spacing |

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
npx hoconfmt --check "src/**/*.conf"
```

### VS Code Task

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Check HOCON",
      "type": "shell",
      "command": "npx hoconfmt --check src/"
    }
  ]
}
```

### CI/CD

```yaml
# GitHub Actions
- name: Check HOCON formatting
  run: npx hoconfmt --check "src/**/*.conf"
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

# Build CLI
npm run build:cli

# Lint
npm run lint
```

```bash
# Run locally

# Check a single file
node bin/hoconfmt.js --check resource/all-cases.conf

# Check entire resource folder
node bin/hoconfmt.js --check resource/

# Format a single file (writes changes)
node bin/hoconfmt.js --write resource/all-cases.conf

# Format entire resource folder (writes changes)
node bin/hoconfmt.js --write resource/
```

## TODO

- [ ] Add Mutation test

## Related

- [HOCON Specification](https://github.com/lightbend/config/blob/main/HOCON.md)
- [pyhocon](https://github.com/chimpler/pyhocon) - Python HOCON parser
- [Standard.js](https://standardjs.com/) - Inspiration for zero-config philosophy
