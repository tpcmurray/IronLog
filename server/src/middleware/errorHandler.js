function errorHandler(err, req, res, _next) {
  if (!err.status || err.status >= 500) {
    console.error(err.stack || err.message);
  }

  const status = err.status || 500;
  const code = err.code || 'SERVER_ERROR';
  const message = err.status ? err.message : 'An unexpected error occurred';

  res.status(status).json({
    error: { message, code },
  });
}

// Helper to create errors with status and code
function createError(status, message, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

module.exports = { errorHandler, createError };
