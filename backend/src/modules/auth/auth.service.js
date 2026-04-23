const jwt = require('jsonwebtoken');
const AppError = require('../../common/errors/AppError');
const { ROLES } = require('../../common/constants/roles');
const User = require('../user/user.model');
const env = require('../../config/env');

const toSafeUser = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
});

const generateToken = (id) => {
  return jwt.sign({ id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
};

const signup = async ({ firstName, lastName, email, password, role }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('An account with this email already exists.', 409);
  }

  const userRole = [ROLES.USER, ROLES.ADMIN].includes(role) ? role : ROLES.USER;

  const user = await User.create({
    firstName,
    lastName,
    email,
    password,
    role: userRole,
  });

  return {
    token: generateToken(user._id),
    user: toSafeUser(user),
  };
};

const login = async ({ email, password, role }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password.', 401);
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password.', 401);
  }

  if (role && user.role !== role) {
    throw new AppError(`You do not have ${role} privileges.`, 403);
  }

  return {
    token: generateToken(user._id),
    user: toSafeUser(user),
  };
};

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User no longer exists.', 401);
  }

  return { user: toSafeUser(user) };
};

module.exports = {
  signup,
  login,
  getMe,
};
