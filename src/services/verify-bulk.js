
import pLimit from 'p-limit';
import { verifyEmail } from './verify-email.js';

const DEFAULT_CONCURRENCY = 5;
const MAX_CONCURRENCY = 10;

export async function verifyBulk(emails, options = {}) {
  if (!Array.isArray(emails)) {
    throw new TypeError('Emails must be provided as an array.');
  }

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

  const limit = pLimit(concurrency);

  const results = await Promise.all(
    uniqueEmails.map(email =>
      limit(async () => {
        try {
          return await verifyEmail(email);
        } catch (error) {
          return {
            email,
            normalized: null,
            status: 'error',
            error: error.message,
            cached: false
          };
        }
      })
    )
  );

  
  const summary = {
    totalSubmitted: emails.length,
    totalUnique: uniqueEmails.length,
    totalProcessed: results.length,
    duplicatesRemoved: emails.length - uniqueEmails.length,

    invalid: results.filter(result =>
      result.status === 'invalid_email' ||
      result.status === 'invalid_domain'
    ).length,

    mailRoutesFound: results.filter(result =>
      result.domain?.mailRoute === true
    ).length,

    noMailRoute: results.filter(result =>
      result.domain?.mailRoute === false
    ).length,

    disposable: results.filter(result =>
      result.disposable?.isDisposable === true
    ).length,

    roleBased: results.filter(result =>
      result.roleBased?.isRoleBased === true
    ).length,

    unknown: results.filter(result =>
      result.status === 'unknown' ||
      result.domain?.mailRoute === null
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
