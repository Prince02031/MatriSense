const Joi = require('joi');

const registerValidation = Joi.object({
    name: Joi.string().min(2).required().messages({
        'string.min': 'Name must be at least 2 characters long',
        'any.required': 'Name is required'
    }),
    phone: Joi.string().required().messages({
        'any.required': 'Phone is required'
    }),
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required'
    }),
    role: Joi.string().valid('MOTHER', 'HEALTH_WORKER').required().messages({
        'any.only': 'Role must be either MOTHER or HEALTH_WORKER',
        'any.required': 'Role is required'
    })
});

module.exports = { registerValidation };
