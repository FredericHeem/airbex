var JsonSchema = require('jsonschema')
, validator = new JsonSchema.Validator()
, validate = validator.validate.bind(validator)

module.exports = function(request, schemaName) {
    var schema = require('./schemas/' + schemaName + '.json')
    if(!request){
        return ({
            name: 'BadRequest',
            message: 'Empty Request'
        })
    }
    var invalid = validate(request, schema)
    if (!invalid.length) return
    
    return ({
        name: 'BadRequest',
        message: 'Request is invalid',
        validation: invalid
    })
}
