
// Main email verification services
export {
  verifyEmail,
  verifyDomainAndMX
} from './services/verify-email.js';

export {
  verifyBulk
} from './services/verify-bulk.js';

export {
  checkDomainSMTP
} from './services/check-domain-smtp.js';

// Email validation
export {
  validateEmailSyntax
} from './validators/syntax.js';

export {
  validateDomain
} from './validators/domain.js';

export {
  validateMX
} from './validators/mx.js';

// Email detectors
export {
  detectDisposableEmail
} from './detectors/disposable.js';

export {
  detectRoleBasedEmail
} from './detectors/role-based.js';

export {
  detectEmailProvider
} from './detectors/provider.js';

export {
  detectCatchAll
} from './detectors/catch-all.js';

// Scoring
export {
  calculateEmailScore
} from './scoring/score.js';

// Email normalization
export {
  normalizeEmail
} from './utils/normalize.js';

// Cache management
export {
  getCache,
  setCache,
  deleteCache,
  clearCache,
  getCacheSize
} from './services/cache.js';
