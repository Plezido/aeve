
const roleBasedPrefixes = new Set([
  'admin',
  'administrator',
  'billing',
  'careers',
  'contact',
  'enquiries',
  'feedback',
  'help',
  'hello',
  'hr',
  'info',
  'jobs',
  'legal',
  'marketing',
  'media',
  'office',
  'operations',
  'press',
  'privacy',
  'recruitment',
  'sales',
  'security',
  'service',
  'support',
  'team',
  'webmaster'
]);

function isRoleBasedPrefix(prefix) {
  if (roleBasedPrefixes.has(prefix)) {
    return true;
  }

  const parts = prefix.split(/[._+-]/);

  return parts.some(part => roleBasedPrefixes.has(part)) ||
    [...roleBasedPrefixes].some(role =>
      new RegExp(`^${role}\\d+$`).test(prefix)
    );
}

export function detectRoleBasedEmail(email) {
  if (typeof email !== 'string' || !email.trim()) {
    return {
      isRoleBased: false,
      prefix: null,
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
      isRoleBased: false,
      prefix: null,
      domain: null,
      status: 'invalid_email',
      reason: 'Email address has an invalid format.'
    };
  }

  const prefix = normalizedEmail.slice(0, atIndex);
  const domain = normalizedEmail.slice(atIndex + 1);

  const isRoleBased = isRoleBasedPrefix(prefix);

  return {
    isRoleBased,
    prefix,
    domain,
    status: isRoleBased ? 'role_based' : 'personal_or_other',
    reason: isRoleBased
      ? 'This address uses a generic business inbox prefix or variation.'
      : null
  };
}
