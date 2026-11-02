import validator from 'validator';
import { normalizeEmail } from '../utils/normalize.js';

export function validateEmailSyntax(input) {
  const normalizedResult = normalizeEmail(input);

  if (!normalizedResult.success) {
    return {
      valid: false,
      email: input ?? null,
      normalized: null,
      reason: normalizedResult.error
    };
  }

  const email = normalizedResult.normalized;

  const valid = validator.isEmail(email, {
    allow_display_name: false,
    allow_utf8_local_part: true,
    require_tld: true,
    allow_ip_domain: false,
    ignore_max_length: false
  });

  return {
    valid,
    email: input,
    normalized: email,
    reason: valid ? null : 'Email address has an invalid format.'
  };
}