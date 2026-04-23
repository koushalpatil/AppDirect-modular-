const sendResponse = (res, {
  statusCode = 200,
  success = true,
  message = 'Request successful.',
  data = null,
}) => {
  return res.status(statusCode).json({
    success,
    message,
    data,
  });
};

module.exports = { sendResponse };
