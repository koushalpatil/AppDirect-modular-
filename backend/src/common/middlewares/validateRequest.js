const { validationResult } = require('express-validator');
const AppError = require('../errors/AppError');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  const details = errors.array().map((error) => ({
    field: error.path,
    message: error.msg,
    value: error.value,
    location: error.location,
  }));

  return next(new AppError('Validation failed.', 400, details));
};

module.exports = validateRequest;
