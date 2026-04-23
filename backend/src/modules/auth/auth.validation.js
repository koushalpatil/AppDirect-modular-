const { body } = require('express-validator');
const { ROLES } = require('../../common/constants/roles');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_RE = /^[a-zA-ZÀ-ÖØ-öø-ÿ\s'-]+$/;
const PW_UPPER = /[A-Z]/;
const PW_LOWER = /[a-z]/;
const PW_DIGIT = /\d/;

const signupValidation = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required.')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters.')
    .matches(NAME_RE).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes.'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required.')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters.')
    .matches(NAME_RE).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes.'),

  body('email')
    .trim()
    .toLowerCase()
    .notEmpty().withMessage('Email is required.')
    .isLength({ max: 254 }).withMessage('Email address is too long.')
    .matches(EMAIL_RE).withMessage('Please provide a valid email address.'),

  body('password')
    .notEmpty().withMessage('Password is required.')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters.')
    .matches(PW_UPPER).withMessage('Password must include an uppercase letter.')
    .matches(PW_LOWER).withMessage('Password must include a lowercase letter.')
    .matches(PW_DIGIT).withMessage('Password must include a number.'),

  body('role')
    .optional()
    .isIn([ROLES.USER, ROLES.ADMIN]).withMessage('Role must be either user or admin.'),
];

const loginValidation = [
  body('email')
    .trim()
    .toLowerCase()
    .notEmpty().withMessage('Email is required.')
    .matches(EMAIL_RE).withMessage('Please provide a valid email address.'),

  body('password')
    .notEmpty().withMessage('Password is required.'),

  body('role')
    .optional()
    .isIn([ROLES.USER, ROLES.ADMIN]).withMessage('Role must be either user or admin.'),
];

module.exports = {
  signupValidation,
  loginValidation,
};
