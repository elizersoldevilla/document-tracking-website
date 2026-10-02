import crypto from 'node:crypto';

export const AUTH_COOKIE = 'clear_session';
export const CSRF_COOKIE = 'clear_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TOKEN_BYTES = 32;

export function createCsrfToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

export function setSessionCookies(res, { token, csrfToken }, config) {
  const common = {
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
  };

  res.cookie(AUTH_COOKIE, token, {
    ...common,
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000,
  });
  res.cookie(CSRF_COOKIE, csrfToken, {
    ...common,
    httpOnly: false,
    maxAge: 8 * 60 * 60 * 1000,
  });
}

export function clearSessionCookies(res, config) {
  const common = {
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
  };
  res.clearCookie(AUTH_COOKIE, { ...common, httpOnly: true });
  res.clearCookie(CSRF_COOKIE, { ...common, httpOnly: false });
}

export function csrfProtection(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies[CSRF_COOKIE];
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken) {
    next(Object.assign(new Error('Invalid CSRF token.'), {
      status: 403,
      code: 'INVALID_CSRF_TOKEN',
    }));
    return;
  }

  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  const matches = cookieBuffer.length === headerBuffer.length
    && crypto.timingSafeEqual(cookieBuffer, headerBuffer);

  if (!matches) {
    next(Object.assign(new Error('Invalid CSRF token.'), {
      status: 403,
      code: 'INVALID_CSRF_TOKEN',
    }));
    return;
  }

  next();
}
