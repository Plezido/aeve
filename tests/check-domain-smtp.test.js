
import test from 'node:test';
import assert from 'node:assert/strict';

import { checkDomainSMTP } from '../src/services/check-domain-smtp.js';

test('connects to the highest-priority discovered MX host', async () => {
  const result = await checkDomainSMTP('test.local', {
    mxResolver: async () => ({
      domain: 'test.local',
      hasMailRoute: true,
      routeType: 'mx',
      status: 'valid',
      mxRecords: [
        { exchange: 'backup.test.local', priority: 20 },
        { exchange: 'primary.test.local', priority: 10 }
      ]
    }),

    smtpChecker: async host => ({
      available: true,
      status: 'connected',
      responseCode: 220,
      host
    })
  });

  assert.equal(result.status, 'connected');
  assert.equal(result.available, true);
  assert.equal(result.mxHost, 'primary.test.local');
  assert.equal(result.attempts.length, 1);
});

test('returns no_mail_route when the domain has no mail route', async () => {
  const result = await checkDomainSMTP('test.local', {
    mxResolver: async () => ({
      domain: 'test.local',
      hasMailRoute: false,
      routeType: 'null_mx',
      status: 'no_mail_route',
      mxRecords: [],
      error: 'No mail route.'
    })
  });

  assert.equal(result.available, false);
  assert.equal(result.status, 'no_mail_route');
  assert.equal(result.mxHost, null);
});

test('returns connection_failed when all MX hosts fail', async () => {
  const result = await checkDomainSMTP('test.local', {
    mxResolver: async () => ({
      domain: 'test.local',
      hasMailRoute: true,
      routeType: 'mx',
      status: 'valid',
      mxRecords: [
        { exchange: 'primary.test.local', priority: 10 }
      ]
    }),

    smtpChecker: async host => ({
      available: false,
      status: 'timeout',
      responseCode: null,
      host
    })
  });

  assert.equal(result.available, false);
  assert.equal(result.status, 'connection_failed');
  assert.equal(result.attempts.length, 1);
});

test('returns invalid_input for invalid domain input', async () => {
  const result = await checkDomainSMTP('', {
    mxResolver: async () => ({
      domain: '',
      hasMailRoute: false,
      status: 'invalid_input',
      error: 'A valid domain is required.'
    })
  });

  assert.equal(result.available, false);
  assert.equal(result.status, 'invalid_input');
});

test('does not try backup MX when primary succeeds', async () => {
  const attemptedHosts = [];

  const result = await checkDomainSMTP('test.local', {
    mxResolver: async () => ({
      domain: 'test.local',
      hasMailRoute: true,
      routeType: 'mx',
      status: 'valid',
      mxRecords: [
        { exchange: 'primary.test.local', priority: 10 },
        { exchange: 'backup.test.local', priority: 20 }
      ]
    }),

    smtpChecker: async host => {
      attemptedHosts.push(host);

      return {
        available: true,
        status: 'connected',
        responseCode: 220
      };
    }
  });

  assert.equal(result.status, 'connected');
  assert.equal(result.mxHost, 'primary.test.local');

  assert.deepEqual(attemptedHosts, [
    'primary.test.local'
  ]);
});

test('tries backup MX when primary connection fails', async () => {
  const attemptedHosts = [];

  const result = await checkDomainSMTP('test.local', {
    mxResolver: async () => ({
      domain: 'test.local',
      hasMailRoute: true,
      routeType: 'mx',
      status: 'valid',
      mxRecords: [
        { exchange: 'primary.test.local', priority: 10 },
        { exchange: 'backup.test.local', priority: 20 }
      ]
    }),

    smtpChecker: async host => {
      attemptedHosts.push(host);

      if (host === 'primary.test.local') {
        return {
          available: false,
          status: 'timeout',
          responseCode: null
        };
      }

      return {
        available: true,
        status: 'connected',
        responseCode: 220
      };
    }
  });

  assert.equal(result.status, 'connected');
  assert.equal(result.mxHost, 'backup.test.local');
  assert.equal(result.attempts.length, 2);

  assert.deepEqual(attemptedHosts, [
    'primary.test.local',
    'backup.test.local'
  ]);
});

test('reports failure when primary and backup MX both fail', async () => {
  const attemptedHosts = [];

  const result = await checkDomainSMTP('test.local', {
    mxResolver: async () => ({
      domain: 'test.local',
      hasMailRoute: true,
      routeType: 'mx',
      status: 'valid',
      mxRecords: [
        { exchange: 'primary.test.local', priority: 10 },
        { exchange: 'backup.test.local', priority: 20 }
      ]
    }),

    smtpChecker: async host => {
      attemptedHosts.push(host);

      return {
        available: false,
        status: 'connection_error',
        responseCode: null
      };
    }
  });

  assert.equal(result.available, false);
  assert.equal(result.status, 'connection_failed');
  assert.equal(result.attempts.length, 2);

  assert.deepEqual(attemptedHosts, [
    'primary.test.local',
    'backup.test.local'
  ]);
});
