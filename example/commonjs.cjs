/**
 * CommonJS example for hoconfmt
 */
const { check, format } = require('../dist/cjs/index.cjs');

// Example HOCON input
const input = `
# Database configuration
database{
host="localhost"
port=5432
}
`;

console.log('=== hoconfmt CommonJS Example ===\n');

// Check if formatted
console.log('Is formatted:', check(input));

// Format the input
const formatted = format(input);
console.log('\nFormatted output:');
console.log(formatted);

// Check again
console.log('Is formatted now:', check(formatted));
