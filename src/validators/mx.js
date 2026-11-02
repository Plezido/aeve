
import {
  resolveMx,
  resolve4,
  resolve6
} from 'node:dns/promises';

async function safeLookup(resolver, domain) {
  try {
    const records = await resolver(domain);

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
        message: error.message
      }
    };
  }
}

export async function validateMX(domain) {
  if (typeof domain !== 'string' || !domain.trim()) {
    return {
      domain: domain ?? null,
      hasMX: false,
      hasMailRoute: false,
      status: 'invalid_input',
      mxRecords: [],
      error: 'A valid domain is required.'
    };
  }

  const normalizedDomain = domain.trim().toLowerCase();

  const mxResult = await safeLookup(resolveMx, normalizedDomain);

  if (mxResult.success && mxResult.records.length > 0) {
    const mxRecords = mxResult.records.sort(
      (a, b) => a.priority - b.priority
    );

    // A Null MX record means the domain does not accept email.
    const isNullMX = mxRecords.some(
      record => record.exchange === '' || record.exchange === '.'
    );

    if (isNullMX) {
      return {
        domain: normalizedDomain,
        hasMX: true,
        hasMailRoute: false,
        routeType: 'null_mx',
        status: 'no_mail_route',
        mxRecords,
        error: 'This domain explicitly does not accept email.'
      };
    }

    return {
      domain: normalizedDomain,
      hasMX: true,
      hasMailRoute: true,
      routeType: 'mx',
      status: 'valid',
      mxRecords,
      error: null
    };
  }

  if (
    !mxResult.success &&
    mxResult.error.code !== 'ENODATA'
  ) {
    return {
      domain: normalizedDomain,
      hasMX: false,
      hasMailRoute: null,
      status: mxResult.error.code === 'ENOTFOUND'
        ? 'domain_not_found'
        : 'unknown',
      mxRecords: [],
      error: mxResult.error
    };
  }

  // RFC 5321 allows implicit MX routing through A/AAAA
  // when a domain has no MX record.

  const [ipv4, ipv6] = await Promise.all([
    safeLookup(resolve4, normalizedDomain),
    safeLookup(resolve6, normalizedDomain)
  ]);

  const hasFallbackRoute =
    ipv4.success || ipv6.success;

  if (hasFallbackRoute) {
    return {
      domain: normalizedDomain,
      hasMX: false,
      hasMailRoute: true,
      routeType: 'implicit_mx',
      status: 'valid',
      mxRecords: [],
      fallbackRecords: {
        ipv4: ipv4.records,
        ipv6: ipv6.records
      },
      error: null
    };
  }

  const errors = [ipv4, ipv6]
    .filter(result => !result.success)
    .map(result => result.error);

  const conclusiveNoRoute = errors.length === 2 &&
    errors.every(error => error.code === 'ENODATA');

  return {
    domain: normalizedDomain,
    hasMX: false,
    hasMailRoute: conclusiveNoRoute ? false : null,
    routeType: null,
    status: conclusiveNoRoute ? 'no_mail_route' : 'unknown',
    mxRecords: [],
    error: errors
  };
}
