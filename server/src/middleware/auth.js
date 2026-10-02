import { AppError } from '../utils/AppError.js';
import { AUTH_COOKIE } from '../utils/csrf.js';

export function createAuthenticationMiddleware(authService) {
  return async function authenticate(req, _res, next) {
    const token = req.cookies[AUTH_COOKIE];
    if (!token) {
      next(new AppError('Authentication is required.', {
        status: 401,
        code: 'AUTHENTICATION_REQUIRED',
      }));
      return;
    }

    try {
      req.user = await authService.authenticate(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRole(...roles) {
  return function roleMiddleware(req, _res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      next(new AppError('You do not have permission to perform this action.', {
        status: 403,
        code: 'ROLE_NOT_ALLOWED',
      }));
      return;
    }
    next();
  };
}
