const router = require('express').Router();
const auth = require('../../middlewares/auth');
const asyncHandler = require('../../common/utils/asyncHandler');
const validateRequest = require('../../common/middlewares/validateRequest');
const { signupValidation, loginValidation } = require('./auth.validation');
const authController = require('./auth.controller');

router.post('/signup', signupValidation, validateRequest, asyncHandler(authController.signup));
router.post('/login', loginValidation, validateRequest, asyncHandler(authController.login));
router.get('/me', auth, asyncHandler(authController.getMe));

module.exports = router;
