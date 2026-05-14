const Joi = require('joi');

const loginValidation = Joi.object({
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required'
    })
}).or('phone', 'email').messages({
    'object.missing': 'Either phone or email is required for login'
});

module.exports = { loginValidation };
