/**
 * hoconfmt CLI - Opinionated HOCON Formatter
 *
 * Usage:
 *   hoconfmt [options] [files...]
 *
 * Options:
 *   --check, -c    Check if files are formatted (default)
 *   --version, -v  Show version number
 *   --help, -h     Show help
 *
 * Examples:
 *   hoconfmt file.conf
 *   hoconfmt "src/**\/*.conf"
 *   hoconfmt --check src/
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { check, format } from './index.js';

interface CliOptions {
  checkOnly: boolean;
  showVersion: boolean;
  showHelp: boolean;
  files: string[];
}

const VERSION = '0.0.0-development';

const HELP_TEXT = `
hoconfmt - Opinionated HOCON Formatter

Usage:
  hoconfmt [options] [files...]

Options:
  --check, -c    Check if files are formatted (exit 0 if ok, 1 if not)
  --version, -v  Show version number
  --help, -h     Show help

Examples:
  hoconfmt file.conf           Check single file
  hoconfmt "src/**/*.conf"     Check files matching glob
  hoconfmt --check src/        Check all .conf files in directory

Formatting Rules (not configurable):
  - 2 spaces indentation
  - key = value (spaces around =)
  - Opening brace on same line
  - Comments normalized to //
  - Trailing whitespace removed
  - Single newline at end of file
  - Double quotes for strings
`;

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    checkOnly: true, // Default behavior is check
    showVersion: false,
    showHelp: false,
    files: [],
  };

  for (const arg of args) {
    if (arg === '--check' || arg === '-c') {
      options.checkOnly = true;
    } else if (arg === '--version' || arg === '-v') {
      options.showVersion = true;
    } else if (arg === '--help' || arg === '-h') {
      options.showHelp = true;
    } else if (!arg.startsWith('-')) {
      options.files.push(arg);
    }
  }

  return options;
}

function findConfFiles(dir: string): string[] {
  const files: string[] = [];

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // Skip node_modules and hidden directories
          if (!entry.startsWith('.') && entry !== 'node_modules') {
            files.push(...findConfFiles(fullPath));
          }
        } else if (stat.isFile() && extname(entry) === '.conf') {
          files.push(fullPath);
        }
      } catch {
        // Skip files we can't access
      }
    }
  } catch {
    // Skip directories we can't read
  }

  return files;
}

function expandGlob(pattern: string): string[] {
  // Simple glob expansion for common patterns
  // For full glob support, users should use shell expansion

  const resolved = resolve(pattern);

  try {
    const stat = statSync(resolved);

    if (stat.isDirectory()) {
      return findConfFiles(resolved);
    } else if (stat.isFile()) {
      return [resolved];
    }
  } catch {
    // Path doesn't exist or is a glob pattern
    // Try to find matching files in current directory
  }

  return [];
}

function expandFiles(patterns: string[]): string[] {
  const files: string[] = [];

  for (const pattern of patterns) {
    files.push(...expandGlob(pattern));
  }

  // Remove duplicates
  return [...new Set(files)];
}

function checkFile(filePath: string): { ok: boolean; error?: string } {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const isFormatted = check(content);

    if (!isFormatted) {
      return { ok: false };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.showHelp) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (options.showVersion) {
    console.log(`hoconfmt v${VERSION}`);
    process.exit(0);
  }

  if (options.files.length === 0) {
    console.error('Error: No files specified');
    console.error('Run "hoconfmt --help" for usage');
    process.exit(1);
  }

  const files = expandFiles(options.files);

  if (files.length === 0) {
    console.error('Error: No .conf files found');
    process.exit(1);
  }

  let hasErrors = false;
  let checkedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const result = checkFile(file);
    checkedCount++;

    if (!result.ok) {
      hasErrors = true;
      errorCount++;

      if (result.error) {
        console.error(`✗ ${file}`);
        console.error(`  Error: ${result.error}`);
      } else {
        console.error(`✗ ${file}`);
        console.error('  File is not formatted correctly');

        // Show expected format
        try {
          const content = readFileSync(file, 'utf-8');
          const formatted = format(content);

          // Show first difference
          const lines = content.split('\n');
          const formattedLines = formatted.split('\n');

          for (let i = 0; i < Math.max(lines.length, formattedLines.length); i++) {
            if (lines[i] !== formattedLines[i]) {
              console.error(`  Line ${i + 1}:`);
              console.error(`    - ${lines[i] ?? '(missing)'}`);
              console.error(`    + ${formattedLines[i] ?? '(missing)'}`);
              break;
            }
          }
        } catch {
          // Ignore formatting errors in diff display
        }
      }
    } else {
      console.log(`✓ ${file}`);
    }
  }

  console.log('');
  console.log(`Checked ${checkedCount} file(s)`);

  if (hasErrors) {
    console.log(`${errorCount} file(s) need formatting`);
    process.exit(1);
  } else {
    console.log('All files are formatted correctly');
    process.exit(0);
  }
}

main();
