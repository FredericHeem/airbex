var JsonSchema = require('jsonschema')
, validator = new JsonSchema.Validator()
, validate = validator.validate.bind(validator)

module.exports = function(request, schemaName, res) {
    var schema = require('./schemas/' + schemaName + '.json')
    , invalid = validate(request, schema)

    if (!invalid.length) return true

    res.send(400, {
        name: 'BadRequest',
        message: 'Request is invalid',
        validation: invalid
    })
    return false
}
