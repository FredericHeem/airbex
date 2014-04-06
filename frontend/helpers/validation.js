var _ = require('lodash')

/**
 * Returns a deferred that validates multiple fields in
 * the form { field1: deferred1, field2: deferred2 }
 */
exports.validateFields = function(fields) {
    return $.when.apply($, _.values(fields))
    .then(function() {
        return _.reduce(arguments, function(results, result, index) {
            results[_.keys(fields)[index]] = result
            return results
        }, {})
    })
}

exports.validateGroup = function($group, fn, submitting) {
    $group.removeClasses(/^(is|has)-/)
    var val = $group.field().val()
    , deferred = $.Deferred()
    .fail(function(code) {
        $group.addClass('has-error ' + code)
    })

    // Invisible inputs are ignored
    if (!$group.is(':visible')) return deferred.resolve(null)

    if (!val.length && submitting !== true) return deferred.resolve(null)

    return fn(deferred, val)
}

exports.validateRegex = function($group, expr, submitting) {
    return exports.validateGroup($group, function(deferred, val) {
        if (val.match(expr)) deferred.resolve(val)
        else deferred.reject('is-invalid')
        return deferred
    }, submitting)
}

exports.fromFn = function($group, fn) {
    return _.bind(exports.validateGroup, exports, $group, fn)
}

exports.fromRegex = function($group, expr) {
    return _.bind(exports.validateRegex, exports, $group, expr)
}

exports.monitorField = function($field, validator) {
    $field.on('change', function() {
        validator()
    })
}

exports.fromFields = function(fields) {
    return function(submitting) {
        var validators = _.reduce(_.keys(fields), function(p, name) {
            p[name] = fields[name](submitting)
            return p
        }, {})

        return exports.validateFields(validators)
    }
}
