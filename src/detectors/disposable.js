
import disposableData from '../data/disposable-domains.json'
  with { type: 'json' };

const disposableDomains = new Set(
  disposableData.domains.map(domain => domain.toLowerCase().trim())
);

export function detectDisposableEmail(email) {
  if (typeof email !== 'string' || !email.trim()) {
    return {
      isDisposable: false,
      domain: null,
      status: 'invalid_input',
      reason: 'A valid email address is required.'
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const atIndex = normalizedEmail.lastIndexOf('@');

  if (
    atIndex <= 0 ||
    atIndex !== normalizedEmail.indexOf('@') ||
    atIndex === normalizedEmail.length - 1
  ) {
    return {
      isDisposable: false,
      domain: null,
      status: 'invalid_email',
      reason: 'Email address has an invalid format.'
    };
  }

  const domain = normalizedEmail.slice(atIndex + 1);

  const isDisposable = disposableDomains.has(domain);

  return {
    isDisposable,
    domain,
    status: isDisposable ? 'disposable' : 'not_listed',
    reason: isDisposable
      ? 'Email domain appears in the disposable-domain database.'
      : null
  };
}
