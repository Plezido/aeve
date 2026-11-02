import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeEmail } from '../src/utils/normalize.js';
import { validateEmailSyntax } from '../src/validators/syntax.js';

// NORMALIZATION TESTS

test('removes surrounding whitespace', () => {
  const result = normalizeEmail('  John@gmail.com  ');

  assert.equal(result.success, true);
  assert.equal(result.normalized, 'John@gmail.com');
});

test('converts domain to lowercase', () => {
  const result = normalizeEmail('John@GMAIL.COM');

  assert.equal(result.normalized, 'John@gmail.com');
});

test('preserves local part casing', () => {
  const result = normalizeEmail('JOHN@GMAIL.COM');

  assert.equal(result.normalized, 'JOHN@gmail.com');
});

test('rejects an email without @', () => {
  const result = normalizeEmail('johngmail.com');

  assert.equal(result.success, false);
});

test('rejects multiple @ separators', () => {
  const result = normalizeEmail('john@@gmail.com');

  assert.equal(result.success, false);
});

// SYNTAX VALIDATION TESTS

test('accepts a correctly formatted email', () => {
  const result = validateEmailSyntax('john@gmail.com');

  assert.equal(result.valid, true);
});

test('rejects an email with missing domain extension', () => {
  const result = validateEmailSyntax('john@gmail');

  assert.equal(result.valid, false);
});

test('rejects an empty email', () => {
  const result = validateEmailSyntax('');

  assert.equal(result.valid, false);
});

test('rejects non-string input', () => {
  const result = validateEmailSyntax(12345);

  assert.equal(result.valid, false);
});