const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100);
const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
const LOGIN_LOCK_MS = Number(process.env.LOGIN_LOCK_MS || 15 * 60_000);
const MAX_CONCURRENT_REQUESTS = Number(process.env.MAX_CONCURRENT_REQUESTS || 120);

const requestBuckets = new Map();
const loginAttemptBuckets = new Map();
let activeRequestCount = 0;

const XSS_RISK_PATTERN = /<\s*script|javascript:|on\w+\s*=|<\s*iframe|<\s*svg|<\s*object|<\s*embed|data:text\/html|vbscript:/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanupMapByTimestamp(targetMap, maxAgeMs, now) {
  for (const [key, value] of targetMap.entries()) {
    if (now - value.timestamp > maxAgeMs) {
      targetMap.delete(key);
    }
  }
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function checkRateLimit(req) {
  const now = Date.now();
  cleanupMapByTimestamp(requestBuckets, RATE_LIMIT_WINDOW_MS, now);

  const ip = getClientIp(req);
  const userId = req.headers['x-user-id'] || req.body?.username || req.body?.staff_username || 'anon';
  const bucketKey = `${ip}:${String(userId).toLowerCase()}`;
  const current = requestBuckets.get(bucketKey);

  if (!current || now - current.timestamp > RATE_LIMIT_WINDOW_MS) {
    requestBuckets.set(bucketKey, { count: 1, timestamp: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  current.count += 1;
  if (current.count > RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - current.timestamp)) / 1000) };
  }
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - current.count };
}

function tryEnterRequest() {
  if (activeRequestCount >= MAX_CONCURRENT_REQUESTS) {
    return false;
  }
  activeRequestCount += 1;
  return true;
}

function leaveRequest() {
  activeRequestCount = Math.max(0, activeRequestCount - 1);
}

function getLoginKey(identifier, req) {
  return `${String(identifier || '').toLowerCase()}:${getClientIp(req)}`;
}

function getLoginAttemptState(identifier, req) {
  const now = Date.now();
  cleanupMapByTimestamp(loginAttemptBuckets, LOGIN_LOCK_MS * 2, now);
  const key = getLoginKey(identifier, req);
  const state = loginAttemptBuckets.get(key);
  if (!state) return { attempts: 0, lockedUntil: 0, remaining: LOGIN_MAX_ATTEMPTS };

  if (state.lockedUntil && now >= state.lockedUntil) {
    loginAttemptBuckets.delete(key);
    return { attempts: 0, lockedUntil: 0, remaining: LOGIN_MAX_ATTEMPTS };
  }

  return {
    attempts: state.attempts,
    lockedUntil: state.lockedUntil || 0,
    remaining: Math.max(0, LOGIN_MAX_ATTEMPTS - state.attempts),
  };
}

function registerLoginFailure(identifier, req) {
  const now = Date.now();
  const key = getLoginKey(identifier, req);
  const previous = loginAttemptBuckets.get(key) || { attempts: 0, timestamp: now, lockedUntil: 0 };
  const attempts = previous.attempts + 1;
  const lockedUntil = attempts >= LOGIN_MAX_ATTEMPTS ? now + LOGIN_LOCK_MS : 0;

  loginAttemptBuckets.set(key, { attempts, timestamp: now, lockedUntil });
  return {
    attempts,
    isLocked: Boolean(lockedUntil),
    lockedUntil,
    remaining: Math.max(0, LOGIN_MAX_ATTEMPTS - attempts),
  };
}

function clearLoginFailures(identifier, req) {
  const key = getLoginKey(identifier, req);
  loginAttemptBuckets.delete(key);
}

function validateRequiredFields(body, fieldNames) {
  const missing = fieldNames.filter((field) => {
    const value = body?.[field];
    return value === undefined || value === null || String(value).trim() === '';
  });
  return {
    valid: missing.length === 0,
    missing,
  };
}

function validateMaxLength(value, max) {
  if (value === undefined || value === null) return true;
  return String(value).length <= max;
}

function isSafeText(value) {
  if (value === undefined || value === null) return true;
  return !XSS_RISK_PATTERN.test(String(value));
}

function validateEmailFormat(email) {
  if (!email) return false;
  return EMAIL_PATTERN.test(String(email).trim());
}

function validateStrongPassword(password) {
  const text = String(password || '');
  const hasLength = text.length >= 8;
  const hasUpper = /[A-Z]/.test(text);
  const hasLower = /[a-z]/.test(text);
  const hasDigit = /\d/.test(text);
  const hasSpecial = /[^A-Za-z0-9]/.test(text);
  return hasLength && hasUpper && hasLower && hasDigit && hasSpecial;
}

module.exports = {
  checkRateLimit,
  tryEnterRequest,
  leaveRequest,
  getLoginAttemptState,
  registerLoginFailure,
  clearLoginFailures,
  validateRequiredFields,
  validateMaxLength,
  isSafeText,
  validateEmailFormat,
  validateStrongPassword,
};
