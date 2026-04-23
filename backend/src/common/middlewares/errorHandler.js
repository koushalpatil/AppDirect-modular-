const { sendResponse } = require('../utils/apiResponse');

const notFoundHandler = (req, res) => {
  return sendResponse(res, {
    statusCode: 404,
    success: false,
    message: 'Route not found.',
    data: null,
  });
};

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';

  if (statusCode >= 500) {
    console.error('Unhandled error:', err);
  }

  return sendResponse(res, {
    statusCode,
    success: false,
    message: err.message || 'Internal server error.',
    data: err.details || (isProd ? null : { stack: err.stack }),
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
