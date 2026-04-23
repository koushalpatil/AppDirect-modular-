const authService = require('./auth.service');
const { sendResponse } = require('../../common/utils/apiResponse');

const signup = async (req, res) => {
  const payload = {
    firstName: req.body.firstName?.trim(),
    lastName: req.body.lastName?.trim(),
    email: req.body.email?.trim().toLowerCase(),
    password: req.body.password,
    role: req.body.role,
  };

  const data = await authService.signup(payload);

  return sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Account created successfully.',
    data,
  });
};

const login = async (req, res) => {
  const payload = {
    email: req.body.email?.trim().toLowerCase(),
    password: req.body.password,
    role: req.body.role,
  };

  const data = await authService.login(payload);

  return sendResponse(res, {
    success: true,
    message: 'Login successful.',
    data,
  });
};

const getMe = async (req, res) => {
  const data = await authService.getMe(req.user._id);

  return sendResponse(res, {
    success: true,
    message: 'Profile fetched successfully.',
    data,
  });
};

module.exports = {
  signup,
  login,
  getMe,
};
