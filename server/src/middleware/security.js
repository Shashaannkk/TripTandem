/**
 * TripTandem Enterprise 20+ Security Hardening Suite
 * Zero-dependency native Node.js / Express security controls.
 */

// 1. Strict Input Sanitization & XSS Defense
export function sanitizeString(val) {
  if (typeof val !== 'string') return val;
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

export function sanitizeDeep(obj, depth = 0) {
  if (depth > 8 || !obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeDeep(item, depth + 1));
  }
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    // 2. Prototype Pollution Defense
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    // 3. NoSQL / Mongo Operator Injection Defense
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    if (typeof value === 'string') {
      clean[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeDeep(value, depth + 1);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

// 4. Express Middleware: XSS, Prototype Pollution & NoSQL Injection Guard
export function securitySanitizerMiddleware(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeDeep(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeDeep(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeDeep(req.params);
    }
  } catch (err) {
    console.warn('[Security] Sanitizer warning:', err.message);
  }
  next();
}

// 5. Secure HTTP Response Headers (Native Helmet Equivalent)
export function secureHeadersMiddleware(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: wss: ws:;"
  );
  res.removeHeader('X-Powered-By');
  next();
}

// 6. Sliding Window In-Memory Rate Limiter (Anti-Brute-Force & Anti-DDoS)
export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 200, message = 'Too many requests, please try again later.' }) {
  const hits = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const now = Date.now();
    const clientRecord = hits.get(ip) || { count: 0, resetAt: now + windowMs };

    if (now > clientRecord.resetAt) {
      clientRecord.count = 0;
      clientRecord.resetAt = now + windowMs;
    }

    clientRecord.count += 1;
    hits.set(ip, clientRecord);

    // Prune stale records periodically
    if (hits.size > 5000) {
      for (const [key, val] of hits.entries()) {
        if (now > val.resetAt) hits.delete(key);
      }
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - clientRecord.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(clientRecord.resetAt / 1000));

    if (clientRecord.count > max) {
      return res.status(429).json({
        success: false,
        error: 'TooManyRequests',
        message,
        retryAfterSeconds: Math.ceil((clientRecord.resetAt - now) / 1000),
      });
    }

    next();
  };
}

export const apiRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 400 });
export const authRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60, message: 'Too many authentication attempts. Please try again in a few minutes.' });
export const aiRateLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 40, message: 'AI Concierge rate limit reached. Please wait a moment.' });

// 7. Socket.IO Flood / Anti-Spam Rate Limiter
export function checkSocketRateLimit(socket, action = 'message', maxPerWindow = 30, windowMs = 5000) {
  if (!socket.rateLimits) socket.rateLimits = new Map();
  const now = Date.now();
  let record = socket.rateLimits.get(action);

  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs };
  }

  record.count += 1;
  socket.rateLimits.set(action, record);

  return record.count <= maxPerWindow;
}

// 8. Safe ID & Path Traversal Validator
const SAFE_ID_REGEX = /^[a-zA-Z0-9_\-\.:]{1,128}$/;

export function isValidSafeId(id) {
  if (!id || typeof id !== 'string') return false;
  if (id.includes('..') || id.includes('/') || id.includes('\\')) return false;
  return SAFE_ID_REGEX.test(id);
}

export function validateSafeIdParam(paramName = 'id') {
  return (req, res, next) => {
    const val = req.params[paramName];
    if (val && !isValidSafeId(val)) {
      return res.status(400).json({
        success: false,
        error: 'InvalidParameter',
        message: `Invalid or unsafe character sequence in parameter "${paramName}".`,
      });
    }
    next();
  };
}

// 9. Sensitive Data Masking (Strip password, hash, salt, internal secrets)
const SENSITIVE_KEYS = new Set(['password', 'passwordHash', 'hash', 'salt', 'tokenHash', 'secretKey', 'jwtSecret']);

export function maskSensitiveData(data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }
  const safe = {};
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(k)) continue;
    if (typeof v === 'object' && v !== null) {
      safe[k] = maskSensitiveData(v);
    } else {
      safe[k] = v;
    }
  }
  return safe;
}

// 10. Budget Integrity & Financial Exploit Defense
export function validateExpenseItem(expense) {
  if (!expense || typeof expense !== 'object') return { valid: false, error: 'Expense payload required' };
  const amount = Number(expense.amount);
  if (isNaN(amount) || amount <= 0 || !isFinite(amount) || amount > 10000000) {
    return { valid: false, error: 'Expense amount must be a positive number up to ₹1,00,00,000' };
  }
  if (!expense.title || typeof expense.title !== 'string' || !expense.title.trim()) {
    return { valid: false, error: 'Expense title is required' };
  }
  return { valid: true };
}

// 11. Google OAuth JWT Structure Validator
export function validateGoogleJwtStructure(jwtToken) {
  if (!jwtToken || typeof jwtToken !== 'string') return { valid: false, error: 'Token string required' };
  const parts = jwtToken.split('.');
  if (parts.length !== 3) return { valid: false, error: 'Invalid JWT structure (must contain 3 parts)' };
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
    if (!payload.sub || !payload.email) {
      return { valid: false, error: 'Missing mandatory sub/email claims' };
    }
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return { valid: false, error: 'Google credential has expired' };
    }
    return { valid: true, payload };
  } catch (e) {
    return { valid: false, error: 'Failed to decode Google JWT payload' };
  }
}

// 12. Safe Global Error Handler (Hides stack traces from clients)
export function safeErrorHandler(err, req, res, next) {
  console.error('[Unhandled Error]', err.stack || err.message || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.name || 'InternalServerError',
    message: process.env.NODE_ENV === 'production' && status === 500
      ? 'An unexpected error occurred. Please contact support.'
      : (err.message || 'Server error'),
  });
}
