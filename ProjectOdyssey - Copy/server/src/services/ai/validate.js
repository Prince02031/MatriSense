const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

function makeValidator(schema) {
  const validate = ajv.compile(schema);

  return (data) => {
    const ok = validate(data);
    return {
      ok,
      errors: ok ? null : validate.errors,
    };
  };
}

module.exports = { makeValidator };
