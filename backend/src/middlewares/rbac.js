const AppError = require('../common/errors/AppError');
const { ROLES } = require('../common/constants/roles');

const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return next(new AppError('Access denied. Admin privileges required.', 403));
  }
  next();
};

module.exports = adminOnly;
