import test from 'node:test';
import assert from 'node:assert/strict';

import { validateDomain } from '../src/validators/domain.js';
import { validateMX } from '../src/validators/mx.js';
import { verifyDomainAndMX } from '../src/services/verify-email.js';

test('rejects an empty domain', async () => {
  const result = await validateDomain('');

  assert.equal(result.status, 'invalid_input');
  assert.equal(result.domainExists, false);
});

test('rejects an invalid domain', async () => {
  const result = await validateDomain('not-a-domain');

  assert.equal(result.status, 'invalid_domain');
});

test('rejects an empty MX domain', async () => {
  const result = await validateMX('');

  assert.equal(result.status, 'invalid_input');
  assert.equal(result.hasMailRoute, false);
});

test('rejects an empty domain verification request', async () => {
  const result = await verifyDomainAndMX('');

  assert.equal(result.domainExists, false);
  assert.equal(result.domainStatus, 'invalid_input');
  assert.equal(result.mxStatus, 'not_checked');
});