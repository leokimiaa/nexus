const { body, param, validationResult } = require('express-validator');

const validateListener = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('source_table').trim().notEmpty().withMessage('Source table is required'),
  body('event')
    .isIn(['INSERT', 'UPDATE', 'DELETE'])
    .withMessage('Event must be INSERT, UPDATE, or DELETE'),
  body('target_url')
    .trim()
    .isURL()
    .withMessage('Target URL must be a valid URL'),
];

const validateUUID = [
  param('id').isUUID().withMessage('Invalid UUID format'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  validateListener,
  validateUUID,
  handleValidationErrors,
};