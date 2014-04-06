var _ = require('lodash')

exports.patch = function(oldModel, newModel) {
    return _.reduce(newModel, function(p, v, k) {
        if (v !== oldModel[k]) p[k] = v
        return p
    }, {})
}
