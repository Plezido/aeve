
import { validateDomain } from '../validators/domain.js';
import { validateMX } from '../validators/mx.js';
import { validateEmailSyntax } from '../validators/syntax.js';
import { detectDisposableEmail } from '../detectors/disposable.js';
import { detectRoleBasedEmail } from '../detectors/role-based.js';
import { detectEmailProvider } from '../detectors/provider.js';
import { detectCatchAll } from '../detectors/catch-all.js';
import { calculateEmailScore } from '../scoring/score.js';
import { getCache, setCache } from './cache.js';
import { checkDomainSMTP } from './check-domain-smtp.js';

export async function verifyDomainAndMX(domain) {
  const domainResult = await validateDomain(domain);

  if (domainResult.domainExists !== true) {
    return {
      domain: domainResult.domain,
      domainExists: domainResult.domainExists,
      domainStatus: domainResult.status,
      mailRoute: null,
      mxStatus: 'not_checked',
      mxRecords: [],
      error: domainResult.error || domainResult.errors
    };
  }

  const mxResult = await validateMX(domainResult.domain);

  return {
    domain: domainResult.domain,
    domainExists: true,
    domainStatus: domainResult.status,
    mailRoute: mxResult.hasMailRoute,
    mxStatus: mxResult.status,
    routeType: mxResult.routeType || null,
    mxRecords: mxResult.mxRecords,
    fallbackRecords: mxResult.fallbackRecords || null,
    error: mxResult.error
  };
}

export async function verifyEmail(input, options = {}) {
  // Step 1: Validate email syntax.
  const syntax = validateEmailSyntax(input);

  if (!syntax.valid) {
    const scoring = calculateEmailScore({ syntax });

    return {
      email: input ?? null,
      normalized: null,
      status: 'invalid_email',
      verificationLevel: 'preliminary',
      mailboxVerified: false,
      syntax,
      domain: null,
      disposable: null,
      roleBased: null,
      provider: null,
      catchAll: {
        isCatchAll: null,
        status: 'unknown',
        reason: 'Email syntax must be valid before further verification.'
      },
      smtpDiagnostics: null,
      scoring,
      cached: false
    };
  }

  const normalized = syntax.normalized;

  // Step 2: Check whether a result is already cached.
  const cachedResult = getCache(normalized);

  if (cachedResult) {
    const result = {
      ...cachedResult,
      cached: true
    };

    if (options.includeSMTP === true) {
      const domainName = normalized.slice(
        normalized.lastIndexOf('@') + 1
      );

      result.smtpDiagnostics = await checkDomainSMTP(
        domainName,
        options.smtpOptions
      );
    }

    return result;
  }

  // Step 3: Extract the email domain.
  const domainName = normalized.slice(normalized.lastIndexOf('@') + 1);

  // Step 4: Run domain and MX verification.
  const domain = await verifyDomainAndMX(domainName);

  // Step 5: Run the local email detectors.
  const disposable = detectDisposableEmail(normalized);
  const roleBased = detectRoleBasedEmail(normalized);
  const provider = detectEmailProvider(normalized);

  // Step 6: Catch-all testing is not yet implemented.
  const catchAll = detectCatchAll({
    smtpAvailable: false
  });

  // Step 7: Calculate the overall preliminary score.
  const scoring = calculateEmailScore({
    syntax,
    domain,
    mailRoute: domain.mailRoute,
    disposable,
    roleBased,
    provider,
    catchAll
  });

  // Step 8: Determine the verification status.
  let status = 'checks_completed';

  if (domain.domainExists === false) {
    status = 'invalid_domain';
  } else if (domain.domainExists === null) {
    status = 'unknown';
  } else if (domain.mailRoute === false) {
    status = 'no_mail_route';
  } else if (domain.mailRoute === null) {
    status = 'unknown';
  }

  // Step 9: Assemble the complete result.
  const result = {
    email: input,
    normalized,
    status,
    verificationLevel: 'domain_and_routing_only',
    mailboxVerified: false,
    syntax,
    domain,
    disposable,
    roleBased,
    provider,
    catchAll,
    smtpDiagnostics: null,
    scoring,
    cached: false
  };

  // Step 10: Cache results unless domain verification was inconclusive.
  if (
    domain.domainStatus !== 'unknown' &&
    domain.mxStatus !== 'unknown' &&
    domain.mxStatus !== 'not_checked'
  ) {
    setCache(normalized, result);
  }

  // Step 11: Run SMTP diagnostics only when explicitly requested.
  if (options.includeSMTP === true) {
    result.smtpDiagnostics = await checkDomainSMTP(
        domainName,
        options.smtpOptions
    );
  }

  return result;
}
