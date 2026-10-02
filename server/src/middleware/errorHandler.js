import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export function notFound(req, _res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, {
    status: 404,
    code: 'ROUTE_NOT_FOUND',
  }));
}

export function errorHandler(error, _req, res, _next) {
  void _next;

  if (error instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: 'Please correct the highlighted fields.',
      code: 'VALIDATION_ERROR',
      errors: error.flatten().fieldErrors,
    });
    return;
  }

  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      message: 'The request body contains invalid JSON.',
      code: 'INVALID_JSON',
    });
    return;
  }

  if (error?.type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      message: 'The request body is too large.',
      code: 'PAYLOAD_TOO_LARGE',
    });
    return;
  }

  const isAppError = error instanceof AppError
    || (Number.isInteger(error.status) && typeof error.code === 'string');
  const status = isAppError ? error.status : 500;
  const code = isAppError ? error.code : 'INTERNAL_ERROR';

  if (status >= 500) {
    console.error(error);
  }

  const response = {
    success: false,
    message: isAppError ? error.message : 'An unexpected error occurred.',
    code,
  };

  if (isAppError && error.details) {
    response.errors = error.details;
  }

  res.status(status).json(response);
}
