const { body, validationResult } = require('express-validator');

// Validation rules
const validationRules = {
  register: [
    body('username').trim().isLength({ min: 2 }).withMessage('Username must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('userType').optional().isIn(['Giver', 'Collector', 'Admin']).withMessage('Invalid user type')
  ],
  
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  
  updateProfile: [
    body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
    body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
    body('phone').optional().matches(/^[0-9\s\-\+\(\)]+$/).withMessage('Invalid phone number')
  ],
  
  addPoints: [
    body('points').isInt({ min: 1 }).withMessage('Points must be a positive integer'),
    body('transaction').notEmpty().withMessage('Transaction description is required')
  ]
};

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  next();
};

module.exports = {
  validationRules,
  validate
};