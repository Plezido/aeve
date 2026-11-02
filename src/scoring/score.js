
export function calculateEmailScore(results) {
  if (!results || typeof results !== 'object') {
    return {
      score: 0,
      rating: 'unknown',
      breakdown: {},
      assessment: 'preliminary',
      reason: 'Verification results are required.'
    };
  }

  const {
    syntax,
    domain,
    mailRoute,
    disposable,
    roleBased,
    catchAll
  } = results;

  if (syntax?.valid !== true) {
    return {
      score: 0,
      rating: 'invalid',
      breakdown: {},
      assessment: 'preliminary',
      reason: 'Email syntax is invalid.'
    };
  }

  if (domain?.domainExists === false) {
    return {
      score: 0,
      rating: 'invalid',
      breakdown: {},
      assessment: 'preliminary',
      reason: 'Email domain does not exist.'
    };
  }

  // Award points only for positive technical evidence.
  const breakdown = {
    syntax: 20,
    domain: domain?.domainExists === true ? 20 : 0,
    mailRoute: mailRoute === true ? 40 : 0
  };

  // Apply penalties for detected risks.
  const penalties = {
    disposable: disposable?.isDisposable === true ? -20 : 0,
    roleBased: roleBased?.isRoleBased === true ? -10 : 0,
    catchAll: catchAll?.isCatchAll === true ? -15 : 0
  };

  const positivePoints = Object.values(breakdown).reduce(
    (total, points) => total + points,
    0
  );

  const totalPenalties = Object.values(penalties).reduce(
    (total, points) => total + points,
    0
  );

  const score = Math.max(
    0,
    Math.min(80, positivePoints + totalPenalties)
  );

  let rating = 'low';

  if (score >= 60) {
    rating = 'promising';
  } else if (score >= 40) {
    rating = 'moderate';
  }

  return {
    score,
    rating,
    breakdown,
    penalties,
    assessment: 'preliminary',
    reason: 'This score measures syntax, domain and mail-routing evidence. It does not confirm mailbox existence or deliverability.'
  };
}
