const { createError } = require('./errorHandler');

// Validate that required fields exist in req.body
function requireFields(...fields) {
  return (req, _res, next) => {
    const missing = fields.filter((f) => req.body[f] === undefined || req.body[f] === null);
    if (missing.length > 0) {
      return next(
        createError(400, `Missing required fields: ${missing.join(', ')}`, 'VALIDATION_ERROR')
      );
    }
    next();
  };
}

// Validate that a param is a valid UUID
function validateUuid(...params) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return (req, _res, next) => {
    for (const param of params) {
      const value = req.params[param];
      if (!value || !uuidRegex.test(value)) {
        return next(
          createError(400, `Invalid UUID for parameter: ${param}`, 'VALIDATION_ERROR')
        );
      }
    }
    next();
  };
}

// Validate numeric body fields are positive numbers
function validatePositiveNumber(...fields) {
  return (req, _res, next) => {
    for (const field of fields) {
      const value = req.body[field];
      if (value !== undefined && value !== null) {
        const num = Number(value);
        if (isNaN(num) || num <= 0) {
          return next(
            createError(400, `${field} must be a positive number`, 'VALIDATION_ERROR')
          );
        }
      }
    }
    next();
  };
}

module.exports = { requireFields, validateUuid, validatePositiveNumber };
