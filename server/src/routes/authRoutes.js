import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createAuthenticationMiddleware } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { csrfProtection } from '../utils/csrf.js';
import { loginSchema } from '../validators/documentSchemas.js';

export function createAuthRouter({ controller, authService, config }) {
  const router = Router();
  const authenticate = createAuthenticationMiddleware(authService);
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.nodeEnv === 'test' ? 1000 : 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many login attempts. Try again later.',
      code: 'LOGIN_RATE_LIMITED',
    },
  });

  router.get('/demo-accounts', controller.demoAccounts);
  router.post('/login', loginLimiter, validate(loginSchema), controller.login);
  router.get('/me', authenticate, controller.me);
  router.post('/logout', authenticate, csrfProtection, controller.logout);

  return router;
}
