const DEFAULT_DNS_TIMEOUT = 5000;

export async function safeDnsLookup(
  resolver,
  domain,
  timeoutMs = DEFAULT_DNS_TIMEOUT
) {
  if (typeof resolver !== 'function') {
    throw new TypeError('A valid DNS resolver function is required.');
  }

  if (
    typeof domain !== 'string' ||
    !domain.trim()
  ) {
    return {
      success: false,
      records: [],
      error: {
        code: 'INVALID_INPUT',
        message: 'A valid domain is required.'
      }
    };
  }

  if (
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  ) {
    throw new RangeError('DNS timeout must be a positive number.');
  }

  let timeout;

  try {
    const records = await Promise.race([
      resolver(domain),
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          const error = new Error('DNS lookup timed out.');
          error.code = 'ETIMEOUT';
          reject(error);
        }, timeoutMs);
      })
    ]);

    return {
      success: true,
      records,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      records: [],
      error: {
        code: error.code || 'UNKNOWN',
        message: error.message || 'DNS lookup failed.'
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}