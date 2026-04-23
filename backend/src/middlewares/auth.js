const jwt = require('jsonwebtoken');
const User = require('../modules/user/user.model');
const AppError = require('../common/errors/AppError');
const asyncHandler = require('../common/utils/asyncHandler');

const auth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required. Please provide a valid token.', 401);
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid token.', 401);
    }
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Token has expired. Please login again.', 401);
    }
    throw error;
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw new AppError('User no longer exists.', 401);
  }

  req.user = user;
  next();
});

module.exports = auth;
