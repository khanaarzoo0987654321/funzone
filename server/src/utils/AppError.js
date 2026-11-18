export class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, message, details);
export const unauthorized = (message = 'You must be signed in to do that.') => new AppError(401, message);
export const forbidden = (message = 'You do not have permission to do that.') => new AppError(403, message);
export const notFound = (message = 'Not found.') => new AppError(404, message);
export const conflict = (message) => new AppError(409, message);

/** Wrap async route handlers so rejected promises reach Express error middleware. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
