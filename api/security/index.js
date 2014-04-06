module.exports = function(app) {
    exports.session = require('./session')(app)
    exports.users = require('./users')(app)
    exports.keys = require('./keys')(app)
    exports.tfa = require('./tfa')(app)
    exports.demand = require('./demand')(app);
    return exports
}
