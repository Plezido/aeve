import { resolve4, resolve6, resolveNs } from 'node:dns/promises';
import { domainToASCII } from 'node:url';
import { parse } from 'tldts';
import { safeDnsLookup } from '../utils/dns.js';

export async function validateDomain(input) {
  if (typeof input !== 'string' || !input.trim()) {
    return {
      domain: input ?? null,
      domainExists: false,
      status: 'invalid_input',
      error: 'A valid domain string is required.'
    };
  }

  const domain = domainToASCII(input.trim().toLowerCase());

  if (!domain) {
    return {
      domain: input,
      domainExists: false,
      status: 'invalid_domain',
      error: 'Domain could not be converted to ASCII.'
    };
  }

  const parsed = parse(domain);

  if (!parsed.domain || !parsed.publicSuffix || parsed.isIp) {
    return {
      domain,
      domainExists: false,
      status: 'invalid_domain',
      error: 'Domain must be a valid public hostname.'
    };
  }

  const [ipv4, ipv6, nameservers] = await Promise.all([
    safeDnsLookup(resolve4, domain),
    safeDnsLookup(resolve6, domain),
    safeDnsLookup(resolveNs, domain)
  ]);

  const hasRecords =
    ipv4.success ||
    ipv6.success ||
    nameservers.success;

  const errors = [ipv4, ipv6, nameservers]
    .filter(result => !result.success)
    .map(result => result.error);

  const hasNoRecordResponse = errors.some(
    error => error.code === 'ENODATA'
  );

  const allNotFound = errors.length === 3 &&
    errors.every(error => error.code === 'ENOTFOUND');

  let status;

  if (hasRecords || hasNoRecordResponse) {
    status = 'exists';
  } else if (allNotFound) {
    status = 'not_found';
  } else {
    status = 'unknown';
  }

  return {
    domain,
    domainExists:
      status === 'exists'
        ? true
        : status === 'not_found'
          ? false
          : null,
    status,
    records: {
      ipv4: ipv4.records,
      ipv6: ipv6.records,
      nameservers: nameservers.records
    },
    errors
  };
}