import test from 'node:test';
import assert from 'node:assert/strict';

import { safeDnsLookup } from '../src/utils/dns.js';

test('returns DNS records when lookup succeeds', async () => {
  const result = await safeDnsLookup(
    async () => ['192.0.2.1'],
    'example.com'
  );

  assert.equal(result.success, true);
  assert.deepEqual(result.records, ['192.0.2.1']);
  assert.equal(result.error, null);
});

test('returns resolver errors safely', async () => {
  const result = await safeDnsLookup(
    async () => {
      const error = new Error('Domain not found');
      error.code = 'ENOTFOUND';
      throw error;
    },
    'missing.example'
  );

  assert.equal(result.success, false);
  assert.deepEqual(result.records, []);
  assert.equal(result.error.code, 'ENOTFOUND');
});

test('returns ETIMEOUT when DNS lookup takes too long', async () => {
  const result = await safeDnsLookup(
    () => new Promise(() => {}),
    'slow.example',
    50
  );

  assert.equal(result.success, false);
  assert.equal(result.error.code, 'ETIMEOUT');
});

test('rejects an invalid resolver', async () => {
  await assert.rejects(
    safeDnsLookup(null, 'example.com'),
    TypeError
  );
});

test('rejects an invalid timeout', async () => {
  await assert.rejects(
    safeDnsLookup(async () => [], 'example.com', 0),
    RangeError
  );
});