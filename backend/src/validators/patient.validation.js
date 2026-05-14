const Joi = require('joi');

const patientValidation = Joi.object({
    name: Joi.string().required().messages({
        'any.required': 'Name is required'
    }),
    age: Joi.number().required().messages({
        'any.required': 'Age is required'
    }),
    trimester: Joi.number().valid(1, 2, 3).required().messages({
        'any.only': 'Trimester must be 1, 2, or 3',
        'any.required': 'Trimester is required'
    }),
    gestationalWeek: Joi.number().required().messages({
        'any.required': 'Gestational week is required'
    }),
    phone: Joi.string().required().messages({
        'any.required': 'Phone is required'
    })
}).unknown(true); // Allow other optional fields

module.exports = { patientValidation };
