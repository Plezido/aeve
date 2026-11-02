
import { validateMX } from '../validators/mx.js';
import { checkSMTPConnection } from '../detectors/smtp.js';

export async function checkDomainSMTP(domain, options = {}) {
  const mxResolver = options.mxResolver ?? validateMX;
  const smtpChecker = options.smtpChecker ?? checkSMTPConnection;

  const mxResult = await mxResolver(domain);

  if (mxResult.status === 'invalid_input') {
    return {
      domain: mxResult.domain,
      status: 'invalid_input',
      available: false,
      mxHost: null,
      mxStatus: mxResult.status,
      smtp: null,
      error: mxResult.error
    };
  }

  if (mxResult.hasMailRoute !== true) {
    return {
      domain: mxResult.domain,
      status: mxResult.status === 'unknown'
        ? 'unknown'
        : 'no_mail_route',
      available: false,
      mxHost: null,
      mxStatus: mxResult.status,
      smtp: null,
      error: mxResult.error
    };
  }

  const hosts = mxResult.routeType === 'implicit_mx'
    ? [mxResult.domain]
    : [...mxResult.mxRecords]
        .sort((a, b) => a.priority - b.priority)
        .map(record => record.exchange)
        .filter(Boolean);

  if (hosts.length === 0) {
    return {
      domain: mxResult.domain,
      status: 'unknown',
      available: false,
      mxHost: null,
      mxStatus: mxResult.status,
      smtp: null,
      error: 'No usable SMTP hostname was found.'
    };
  }

  const attempts = [];

  for (const host of hosts) {
    const smtp = await smtpChecker(host, options);

    attempts.push({
      host,
      status: smtp.status,
      responseCode: smtp.responseCode
    });

    if (smtp.available) {
      return {
        domain: mxResult.domain,
        status: 'connected',
        available: true,
        mxHost: host,
        mxStatus: mxResult.status,
        smtp,
        attempts,
        error: null
      };
    }
  }

  return {
    domain: mxResult.domain,
    status: 'connection_failed',
    available: false,
    mxHost: null,
    mxStatus: mxResult.status,
    smtp: null,
    attempts,
    error: 'None of the discovered mail servers returned a successful SMTP greeting.'
  };
}
