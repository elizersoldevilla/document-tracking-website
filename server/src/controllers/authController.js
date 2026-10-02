import { createCsrfToken, clearSessionCookies, setSessionCookies } from '../utils/csrf.js';

export function createAuthController({ authService, config }) {
  return {
    demoAccounts: (_req, res) => {
      if (!config.demoLogin.enabled) {
        res.status(404).json({
          success: false,
          message: 'Demo accounts are not enabled.',
          code: 'DEMO_LOGIN_DISABLED',
        });
        return;
      }

      res.set('Cache-Control', 'no-store');
      res.status(200).json({
        success: true,
        message: 'Demo accounts retrieved.',
        data: config.demoLogin.accounts,
      });
    },

    login: async (req, res) => {
      const { token, user } = await authService.login(req.body.email, req.body.password);
      const csrfToken = createCsrfToken();
      setSessionCookies(res, { token, csrfToken }, config);

      res.status(200).json({
        success: true,
        message: 'Signed in successfully.',
        data: { user, csrfToken },
      });
    },

    logout: async (req, res) => {
      clearSessionCookies(res, config);
      res.status(200).json({
        success: true,
        message: 'Signed out successfully.',
        data: null,
      });
    },

    me: async (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Current user retrieved.',
        data: { user: req.user },
      });
    },
  };
}
