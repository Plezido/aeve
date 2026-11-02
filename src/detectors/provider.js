
const emailProviders = {
  'gmail.com': 'Google Gmail',
  'googlemail.com': 'Google Gmail',
  'outlook.com': 'Microsoft Outlook',
  'hotmail.com': 'Microsoft Outlook',
  'live.com': 'Microsoft Outlook',
  'msn.com': 'Microsoft Outlook',
  'yahoo.com': 'Yahoo Mail',
  'yahoo.co.uk': 'Yahoo Mail',
  'ymail.com': 'Yahoo Mail',
  'icloud.com': 'Apple iCloud Mail',
  'me.com': 'Apple iCloud Mail',
  'mac.com': 'Apple iCloud Mail',
  'proton.me': 'Proton Mail',
  'protonmail.com': 'Proton Mail',
  'pm.me': 'Proton Mail',
  'zoho.com': 'Zoho Mail',
  'zohomail.com': 'Zoho Mail',
  'gmx.com': 'GMX Mail',
  'gmx.net': 'GMX Mail',
  'mail.com': 'Mail.com',
  'fastmail.com': 'Fastmail',
  'tutanota.com': 'Tuta Mail',
  'tuta.com': 'Tuta Mail'
};

export function detectEmailProvider(email) {
  if (typeof email !== 'string' || !email.trim()) {
    return {
      provider: null,
      domain: null,
      isKnownProvider: false,
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
      provider: null,
      domain: null,
      isKnownProvider: false,
      status: 'invalid_email',
      reason: 'Email address has an invalid format.'
    };
  }

  const domain = normalizedEmail.slice(atIndex + 1);
  const provider = emailProviders[domain] || null;

  return {
    provider,
    domain,
    isKnownProvider: Boolean(provider),
    status: provider ? 'known_provider' : 'custom_or_unknown',
    reason: provider
      ? `Email provider identified as ${provider}.`
      : 'Email domain is not in the known provider database.'
  };
}
