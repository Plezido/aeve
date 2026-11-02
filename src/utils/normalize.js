import { domainToASCII } from 'node:url';

export function normalizeEmail(input) {
  if (typeof input !== 'string') {
    return {
      success: false,
      original: input ?? null,
      normalized: null,
      error: 'Email must be a string.'
    };
  }

  const trimmed = input.trim();

  if (!trimmed) {
    return {
      success: false,
      original: input,
      normalized: null,
      error: 'Email address cannot be empty.'
    };
  }

  const atIndex = trimmed.lastIndexOf('@');

  if (
    atIndex <= 0 ||
    atIndex !== trimmed.indexOf('@') ||
    atIndex === trimmed.length - 1
  ) {
    return {
      success: false,
      original: input,
      normalized: null,
      error: 'Email must contain exactly one valid @ separator.'
    };
  }

  const localPart = trimmed.slice(0, atIndex);
  const originalDomain = trimmed.slice(atIndex + 1);

  const domain = domainToASCII(originalDomain.toLowerCase());

  if (!domain) {
    return {
      success: false,
      original: input,
      normalized: null,
      error: 'Email domain is invalid.'
    };
  }

  return {
    success: true,
    original: input,
    normalized: `${localPart}@${domain}`,
    localPart,
    domain,
    error: null
  };
}