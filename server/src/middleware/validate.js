import { AppError } from '../utils/AppError.js';

export function validate(schema, source = 'body') {
  return function validationMiddleware(req, _res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || 'request';
        if (!errors[key]) {
          errors[key] = issue.message;
        }
      }
      next(new AppError('Please correct the highlighted fields.', {
        status: 422,
        code: 'VALIDATION_ERROR',
        details: errors,
      }));
      return;
    }
    req.validated = {
      ...(req.validated || {}),
      [source]: result.data,
    };
    if (source !== 'query') {
      req[source] = result.data;
    }
    next();
  };
}
