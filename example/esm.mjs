/**
 * ESM example for hoconfmt
 */
import { check, format } from '../dist/esm/index.js';

// Hardcoded string for simplicity and copy-paste friendliness
// (see resource/all-cases.conf for comprehensive test cases)
const input = `
# Database configuration
database{
host="localhost"
port=5432
}
`;

console.log('=== hoconfmt ESM Example ===\n');

// Check if formatted
console.log('Is formatted:', check(input));

// Format the input
const formatted = format(input);
console.log('\nFormatted output:');
console.log(formatted);

// Check again
console.log('Is formatted now:', check(formatted));
