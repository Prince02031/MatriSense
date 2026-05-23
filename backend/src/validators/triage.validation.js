const Joi = require('joi');

const triageValidation = Joi.object({
    inputTextBn: Joi.string().min(3).required().messages({
        'string.min': 'Input must be at least 3 characters long',
        'any.required': 'Bangla symptom input is required'
    })
}).unknown(true);

module.exports = { triageValidation };
