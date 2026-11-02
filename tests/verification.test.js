
import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyBulk } from '../src/services/verify-bulk.js';
import pLimit from 'p-limit';
import { verifyEmail } from '../src/services/verify-email.js';
import { detectRoleBasedEmail } from '../src/detectors/role-based.js';
import { detectDisposableEmail } from '../src/detectors/disposable.js';
import { detectEmailProvider } from '../src/detectors/provider.js';
import { detectCatchAll } from '../src/detectors/catch-all.js';
import { calculateEmailScore } from '../src/scoring/score.js';
import {
  setCache,
  getCache,
  deleteCache,
  clearCache,
  getCacheSize
} from '../src/services/cache.js';

test('detects a known disposable email', () => {
  const result = detectDisposableEmail('user@mailinator.com');

  assert.equal(result.isDisposable, true);
  assert.equal(result.domain, 'mailinator.com');
  assert.equal(result.status, 'disposable');
});

test('detects disposable emails regardless of letter case', () => {
  const result = detectDisposableEmail('USER@MAILINATOR.COM');

  assert.equal(result.isDisposable, true);
});

test('detects disposable emails with surrounding whitespace', () => {
  const result = detectDisposableEmail(' user@yopmail.com ');

  assert.equal(result.isDisposable, true);
});

test('does not flag an unlisted domain', () => {
  const result = detectDisposableEmail('user@gmail.com');

  assert.equal(result.isDisposable, false);
  assert.equal(result.status, 'not_listed');
});

test('rejects an empty email', () => {
  const result = detectDisposableEmail('');

  assert.equal(result.status, 'invalid_input');
});

test('rejects an invalid email format', () => {
  const result = detectDisposableEmail('invalid-email');

  assert.equal(result.status, 'invalid_email');
});

test('rejects multiple @ symbols', () => {
  const result = detectDisposableEmail('user@@mailinator.com');

  assert.equal(result.status, 'invalid_email');
});

test('rejects non-string input', () => {
  const result = detectDisposableEmail(null);

  assert.equal(result.status, 'invalid_input');
});

test('detects a role-based email', () => {
  const result = detectRoleBasedEmail('info@company.com');

  assert.equal(result.isRoleBased, true);
  assert.equal(result.prefix, 'info');
  assert.equal(result.status, 'role_based');
});

test('detects support email addresses', () => {
  const result = detectRoleBasedEmail('support@company.com');

  assert.equal(result.isRoleBased, true);
});

test('does not classify personal email addresses as role-based', () => {
  const result = detectRoleBasedEmail('john@company.com');

  assert.equal(result.isRoleBased, false);
  assert.equal(result.status, 'personal_or_other');
});

test('handles uppercase email addresses', () => {
  const result = detectRoleBasedEmail('SALES@COMPANY.COM');

  assert.equal(result.isRoleBased, true);
});

test('rejects empty input', () => {
  const result = detectRoleBasedEmail('');

  assert.equal(result.status, 'invalid_input');
});

test('rejects invalid email formats', () => {
  const result = detectRoleBasedEmail('invalid-email');

  assert.equal(result.status, 'invalid_email');
});

test('detects department prefixes with location suffixes', () => {
  const result = detectRoleBasedEmail('sales.ng@company.com');

  assert.equal(result.isRoleBased, true);
});

test('detects department prefixes with separators', () => {
  const result = detectRoleBasedEmail('support-team@company.com');

  assert.equal(result.isRoleBased, true);
});

test('detects numbered role-based prefixes', () => {
  const result = detectRoleBasedEmail('info123@company.com');

  assert.equal(result.isRoleBased, true);
});

test('detects Gmail', () => {
  const result = detectEmailProvider('john@gmail.com');

  assert.equal(result.provider, 'Google Gmail');
  assert.equal(result.isKnownProvider, true);
});

test('detects Microsoft Outlook', () => {
  const result = detectEmailProvider('john@outlook.com');

  assert.equal(result.provider, 'Microsoft Outlook');
});

test('detects Yahoo Mail', () => {
  const result = detectEmailProvider('john@yahoo.com');

  assert.equal(result.provider, 'Yahoo Mail');
});

test('detects Apple iCloud Mail', () => {
  const result = detectEmailProvider('john@icloud.com');

  assert.equal(result.provider, 'Apple iCloud Mail');
});

test('detects Proton Mail', () => {
  const result = detectEmailProvider('john@proton.me');

  assert.equal(result.provider, 'Proton Mail');
});

test('does not classify unknown domains as known providers', () => {
  const result = detectEmailProvider('hello@mycompany.com');

  assert.equal(result.isKnownProvider, false);
  assert.equal(result.status, 'custom_or_unknown');
});

test('handles uppercase provider domains', () => {
  const result = detectEmailProvider('JOHN@GMAIL.COM');

  assert.equal(result.isKnownProvider, true);
});

test('rejects invalid email input', () => {
  const result = detectEmailProvider('invalid-email');

  assert.equal(result.status, 'invalid_email');
});

test('rejects empty input', () => {
  const result = detectEmailProvider('');

  assert.equal(result.status, 'invalid_input');
});

test('detects a catch-all domain', () => {
  const result = detectCatchAll({
    realAddressAccepted: true,
    randomAddressAccepted: true,
    smtpAvailable: true
  });

  assert.equal(result.isCatchAll, true);
  assert.equal(result.status, 'catch_all');
});

test('detects a non-catch-all domain', () => {
  const result = detectCatchAll({
    realAddressAccepted: true,
    randomAddressAccepted: false,
    smtpAvailable: true
  });

  assert.equal(result.isCatchAll, false);
  assert.equal(result.status, 'not_catch_all');
});

test('returns unknown when SMTP is unavailable', () => {
  const result = detectCatchAll({
    smtpAvailable: false
  });

  assert.equal(result.status, 'unknown');
});

test('returns unknown for incomplete results', () => {
  const result = detectCatchAll({
    realAddressAccepted: true,
    smtpAvailable: true
  });

  assert.equal(result.status, 'unknown');
});

test('returns unknown for invalid input', () => {
  const result = detectCatchAll(null);

  assert.equal(result.status, 'unknown');
});

test('returns unknown when both addresses are rejected', () => {
  const result = detectCatchAll({
    realAddressAccepted: false,
    randomAddressAccepted: false,
    smtpAvailable: true
  });

  assert.equal(result.status, 'unknown');
});


test('calculates a maximum preliminary score of 80', () => {
  const result = calculateEmailScore({
    syntax: { valid: true },
    domain: { domainExists: true },
    mailRoute: true,
    disposable: { isDisposable: false },
    roleBased: { isRoleBased: false },
    provider: { isKnownProvider: true },
    catchAll: { status: 'unknown', isCatchAll: null }
  });

  assert.equal(result.score, 80);
  assert.equal(result.rating, 'promising');
  assert.equal(result.assessment, 'preliminary');
});



test('applies penalties for disposable and role-based addresses', () => {
  const result = calculateEmailScore({
    syntax: { valid: true },
    domain: { domainExists: true },
    mailRoute: true,
    disposable: { isDisposable: true },
    roleBased: { isRoleBased: true },
    catchAll: { isCatchAll: false }
  });

  assert.equal(result.score, 50);
  assert.equal(result.penalties.disposable, -20);
  assert.equal(result.penalties.roleBased, -10);
});


test('returns zero for invalid syntax', () => {
  const result = calculateEmailScore({
    syntax: { valid: false }
  });

  assert.equal(result.score, 0);
  assert.equal(result.rating, 'invalid');
});

test('returns zero for nonexistent domain', () => {
  const result = calculateEmailScore({
    syntax: { valid: true },
    domain: { domainExists: false }
  });

  assert.equal(result.score, 0);
  assert.equal(result.rating, 'invalid');
});

test('does not award points for unknown verification results', () => {
  const result = calculateEmailScore({
    syntax: { valid: true },
    domain: { domainExists: true },
    mailRoute: null,
    disposable: null,
    roleBased: null,
    provider: null,
    catchAll: { status: 'unknown' }
  });

  assert.equal(result.score, 40);
});

test('returns unknown for missing verification results', () => {
  const result = calculateEmailScore(null);

  assert.equal(result.score, 0);
  assert.equal(result.rating, 'unknown');
});

test('stores and retrieves a cached result', () => {
  clearCache();

  const result = { score: 95 };

  setCache('john@gmail.com', result);

  assert.deepEqual(getCache('john@gmail.com'), result);
});

test('cache lookup is case-insensitive', () => {
  clearCache();

  setCache('John@Gmail.com', { score: 90 });

  assert.deepEqual(getCache('john@gmail.com'), { score: 90 });
});

test('returns null for missing cache entries', () => {
  clearCache();

  assert.equal(getCache('missing@gmail.com'), null);
});

test('deletes a cached entry', () => {
  clearCache();

  setCache('john@gmail.com', { score: 90 });

  assert.equal(deleteCache('john@gmail.com'), true);
  assert.equal(getCache('john@gmail.com'), null);
});

test('clears all cached entries', () => {
  clearCache();

  setCache('john@gmail.com', { score: 90 });
  setCache('jane@gmail.com', { score: 80 });

  clearCache();

  assert.equal(getCacheSize(), 0);
});

test('expires cached entries', async () => {
  clearCache();

  setCache('john@gmail.com', { score: 90 }, 20);

  await new Promise(resolve => setTimeout(resolve, 40));

  assert.equal(getCache('john@gmail.com'), null);
});

test('rejects invalid cache input', () => {
  clearCache();

  assert.equal(setCache('', { score: 90 }), false);
  assert.equal(getCache(''), null);
});

test('rejects invalid cache expiration values', () => {
  clearCache();

  assert.equal(setCache('john@gmail.com', { score: 90 }, -100), false);
});

test('verifyEmail rejects invalid email addresses', async () => {
  const result = await verifyEmail('invalid-email');

  assert.equal(result.status, 'invalid_email');
  assert.equal(result.scoring.score, 0);
  assert.equal(result.cached, false);
});

test('verifyEmail returns a complete result structure', async () => {
  clearCache();

  const result = await verifyEmail('test@gmail.com');

  assert.ok(result.email);
  assert.ok(result.normalized);
  assert.ok(result.syntax);
  assert.ok(result.domain);
  assert.ok(result.disposable);
  assert.ok(result.roleBased);
  assert.ok(result.provider);
  assert.ok(result.catchAll);
  assert.ok(result.scoring);
  assert.equal(typeof result.scoring.score, 'number');
});

test('verifyEmail identifies known email providers', async () => {
  clearCache();

  const result = await verifyEmail('test@gmail.com');

  assert.equal(result.provider.provider, 'Google Gmail');
  assert.equal(result.provider.isKnownProvider, true);
});

test('verifyEmail preserves unknown catch-all status', async () => {
  clearCache();

  const result = await verifyEmail('test@gmail.com');

  assert.equal(result.catchAll.status, 'unknown');
});

test('verifyEmail uses cached results on repeated requests', async () => {
  clearCache();

  await verifyEmail('test@gmail.com');

  const result = await verifyEmail('test@gmail.com');

  assert.equal(result.cached, true);
});

test('verifyBulk rejects non-array input', async () => {
  await assert.rejects(
    verifyBulk('test@gmail.com'),
    {
      name: 'TypeError'
    }
  );
});

test('verifyBulk rejects batches larger than 1000 emails', async () => {
  const emails = Array.from(
    { length: 1001 },
    (_, index) => `user${index}@example.com`
  );

  await assert.rejects(
    verifyBulk(emails),
    {
      name: 'RangeError',
      message: 'A maximum of 1000 emails can be processed per batch.'
    }
  );
});

test('verifyBulk accepts a batch of exactly 1000 emails', async () => {
  const emails = Array.from(
    { length: 1000 },
    (_, index) => `invalid-${index}`
  );

  const result = await verifyBulk(emails);

  assert.equal(result.summary.totalSubmitted, 1000);
  assert.equal(result.summary.totalUnique, 1000);
  assert.equal(result.summary.totalProcessed, 1000);
});

test('verifyBulk rejects invalid concurrency values', async () => {
  await assert.rejects(
    verifyBulk(['test@gmail.com'], { concurrency: 0 }),
    {
      name: 'RangeError'
    }
  );
});

test('verifyBulk removes duplicate emails', async () => {
  clearCache();

  const result = await verifyBulk([
    'test@gmail.com',
    'TEST@GMAIL.COM',
    'another@gmail.com'
  ]);

  assert.equal(result.summary.totalSubmitted, 3);
  assert.equal(result.summary.totalUnique, 2);
  assert.equal(result.summary.duplicatesRemoved, 1);
  assert.equal(result.results.length, 2);
});

test('verifyBulk returns individual verification results', async () => {
  clearCache();

  const result = await verifyBulk([
    'test@gmail.com',
    'invalid-email'
  ]);

  assert.equal(result.results.length, 2);
  assert.ok(result.results[0].syntax);
  assert.equal(result.results[1].status, 'invalid_email');
});

test('verifyBulk counts invalid email addresses', async () => {
  clearCache();

  const result = await verifyBulk([
    'invalid-email',
    'another-invalid-email'
  ]);

  assert.equal(result.summary.invalid, 2);
});

test('verifyBulk respects the maximum concurrency setting', async () => {
  await assert.rejects(
    verifyBulk(['test@gmail.com'], { concurrency: 11 }),
    {
      name: 'RangeError'
    }
  );
});

test('p-limit never exceeds the configured concurrency', async () => {
  const limit = pLimit(3);

  let activeTasks = 0;
  let maximumActiveTasks = 0;

  const tasks = Array.from({ length: 10 }, () =>
    limit(async () => {
      activeTasks++;

      maximumActiveTasks = Math.max(
        maximumActiveTasks,
        activeTasks
      );

      await new Promise(resolve => setTimeout(resolve, 20));

      activeTasks--;
    })
  );

  await Promise.all(tasks);

  assert.equal(maximumActiveTasks, 3);
  assert.equal(activeTasks, 0);
});

test('verifyEmail does not run SMTP diagnostics by default', async () => {
  clearCache();

  const result = await verifyEmail('smtp-default-test@gmail.com');

  assert.equal(result.smtpDiagnostics, null);
  assert.equal(result.mailboxVerified, false);
});

test('verifyEmail runs SMTP diagnostics when explicitly requested', async () => {
  clearCache();

  const result = await verifyEmail('smtp-enabled-test@gmail.com', {
    includeSMTP: true,
    smtpOptions: {
      mxResolver: async domain => ({
        domain,
        status: 'valid',
        hasMailRoute: true,
        routeType: 'mx',
        mxRecords: [
          { exchange: 'mock.smtp.test', priority: 10 }
        ]
      }),

      smtpChecker: async host => ({
        host,
        available: true,
        status: 'connected',
        responseCode: 220,
        error: null
      })
    }
  });

  assert.equal(result.smtpDiagnostics.available, true);
  assert.equal(result.smtpDiagnostics.status, 'connected');
  assert.equal(result.smtpDiagnostics.mxHost, 'mock.smtp.test');
  assert.equal(result.mailboxVerified, false);
});

test('verifyEmail does not change its preliminary score after SMTP diagnostics', async () => {
  clearCache();

  const normalResult = await verifyEmail('smtp-score-test@gmail.com');

  const smtpResult = await verifyEmail('smtp-score-test@gmail.com', {
    includeSMTP: true,
    smtpOptions: {
      mxResolver: async domain => ({
        domain,
        status: 'valid',
        hasMailRoute: true,
        routeType: 'mx',
        mxRecords: [
          { exchange: 'mock.smtp.test', priority: 10 }
        ]
      }),

      smtpChecker: async host => ({
        host,
        available: true,
        status: 'connected',
        responseCode: 220,
        error: null
      })
    }
  });

  assert.equal(
    smtpResult.scoring.score,
    normalResult.scoring.score
  );

  assert.equal(smtpResult.scoring.assessment, 'preliminary');
  assert.equal(smtpResult.mailboxVerified, false);
});

test('verifyEmail can run SMTP diagnostics on a cached result', async () => {
  clearCache();

  await verifyEmail('smtp-cache-test@gmail.com');

  const result = await verifyEmail('smtp-cache-test@gmail.com', {
    includeSMTP: true,
    smtpOptions: {
      mxResolver: async domain => ({
        domain,
        status: 'valid',
        hasMailRoute: true,
        routeType: 'mx',
        mxRecords: [
          { exchange: 'mock.smtp.test', priority: 10 }
        ]
      }),

      smtpChecker: async host => ({
        host,
        available: true,
        status: 'connected',
        responseCode: 220,
        error: null
      })
    }
  });

  assert.equal(result.cached, true);
  assert.equal(result.smtpDiagnostics.available, true);
  assert.equal(result.mailboxVerified, false);
});

test('verifyBulk isolates individual verification failures', async () => {
  const result = await verifyBulk(
    ['good@example.com', 'failed@example.com'],
    {
      verifyEmailFn: async email => {
        if (email === 'failed@example.com') {
          throw new Error('Simulated verification failure.');
        }

        return {
          email,
          status: 'checks_completed',
          domain: {
            mailRoute: true
          }
        };
      }
    }
  );

  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].status, 'checks_completed');
  assert.equal(result.results[1].status, 'error');

  assert.equal(result.summary.totalProcessed, 2);
  assert.equal(result.summary.errors, 1);
  assert.equal(result.summary.mailRoutesFound, 1);
});