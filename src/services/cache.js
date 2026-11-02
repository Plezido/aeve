
const cache = new Map();

const DEFAULT_TTL = 60 * 60 * 1000; // 1 hour

export function setCache(email, result, ttl = DEFAULT_TTL) {
  if (typeof email !== 'string' || !email.trim()) {
    return false;
  }

  if (!Number.isFinite(ttl) || ttl <= 0) {
    return false;
  }

  const key = email.trim().toLowerCase();

  cache.set(key, {
    result,
    expiresAt: Date.now() + ttl
  });

  return true;
}

export function getCache(email) {
  if (typeof email !== 'string' || !email.trim()) {
    return null;
  }

  const key = email.trim().toLowerCase();
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.result;
}

export function deleteCache(email) {
  if (typeof email !== 'string' || !email.trim()) {
    return false;
  }

  return cache.delete(email.trim().toLowerCase());
}

export function clearCache() {
  cache.clear();
}

export function getCacheSize() {
  return cache.size;
}
