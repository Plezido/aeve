
import pLimit from 'p-limit';
import { verifyEmail } from './verify-email.js';

const DEFAULT_CONCURRENCY = 5;
const MAX_CONCURRENCY = 10;
const MAX_BATCH_SIZE = 1000;

export async function verifyBulk(emails, options = {}) {
  // Validate input.
  if (!Array.isArray(emails)) {
    throw new TypeError('Emails must be provided as an array.');
  }

  // Prevent excessively large batches.
  if (emails.length > MAX_BATCH_SIZE) {
    throw new RangeError(
      `A maximum of ${MAX_BATCH_SIZE} emails can be processed per batch.`
    );
  }

  // Validate concurrency.
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;

  if (
    !Number.isInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > MAX_CONCURRENCY
  ) {
    throw new RangeError(
      `Concurrency must be between 1 and ${MAX_CONCURRENCY}.`
    );
  }

  // Allow an alternative verification function for testing.
  const verifyEmailFn = options.verifyEmailFn ?? verifyEmail;

  if (typeof verifyEmailFn !== 'function') {
    throw new TypeError('verifyEmailFn must be a function.');
  }

  // Remove duplicate email addresses.
  const uniqueEmails = [
    ...new Map(
      emails.map(email => {
        const key = typeof email === 'string'
          ? email.trim().toLowerCase()
          : email;

        return [key, email];
      })
    ).values()
  ];

  // Apply concurrency control.
  const limit = pLimit(concurrency);

  const results = await Promise.all(
    uniqueEmails.map(email =>
      limit(async () => {
        try {
          return await verifyEmailFn(email);
        } catch (error) {
          return {
            email,
            normalized: null,
            status: 'error',
            error: error.message || 'Verification failed.',
            cached: false
          };
        }
      })
    )
  );

  // Generate bulk verification summary.
  const summary = {
    totalSubmitted: emails.length,
    totalUnique: uniqueEmails.length,
    totalProcessed: results.length,
    duplicatesRemoved: emails.length - uniqueEmails.length,

    checksCompleted: results.filter(result =>
      result.status === 'checks_completed'
    ).length,

    invalid: results.filter(result =>
      result.status === 'invalid_email' ||
      result.status === 'invalid_domain'
    ).length,

    mailRoutesFound: results.filter(result =>
      result.domain?.mailRoute === true
    ).length,

    noMailRoute: results.filter(result =>
      result.status === 'no_mail_route'
    ).length,

    disposable: results.filter(result =>
      result.disposable?.isDisposable === true
    ).length,

    roleBased: results.filter(result =>
      result.roleBased?.isRoleBased === true
    ).length,

    unknown: results.filter(result =>
      result.status === 'unknown'
    ).length,

    errors: results.filter(result =>
      result.status === 'error'
    ).length
  };

  return {
    summary,
    results
  };
}
