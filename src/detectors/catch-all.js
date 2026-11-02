
export function detectCatchAll(result) {
  if (!result || typeof result !== 'object') {
    return {
      isCatchAll: null,
      status: 'unknown',
      reason: 'SMTP verification results are required.'
    };
  }

  const {
    realAddressAccepted,
    randomAddressAccepted,
    smtpAvailable
  } = result;

  if (smtpAvailable !== true) {
    return {
      isCatchAll: null,
      status: 'unknown',
      reason: 'SMTP verification was unavailable.'
    };
  }

  if (
    typeof realAddressAccepted !== 'boolean' ||
    typeof randomAddressAccepted !== 'boolean'
  ) {
    return {
      isCatchAll: null,
      status: 'unknown',
      reason: 'Incomplete SMTP verification results.'
    };
  }

  if (randomAddressAccepted) {
    return {
      isCatchAll: true,
      status: 'catch_all',
      reason: 'The server accepted a randomly generated email address.'
    };
  }

  if (realAddressAccepted && !randomAddressAccepted) {
    return {
      isCatchAll: false,
      status: 'not_catch_all',
      reason: 'The server accepted the test address but rejected the random address.'
    };
  }

  return {
    isCatchAll: null,
    status: 'unknown',
    reason: 'The SMTP responses were inconclusive.'
  };
}
