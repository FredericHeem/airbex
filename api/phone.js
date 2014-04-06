var debug = require('debug')('snow:phone')

module.exports = exports = function(app) {
    exports.app = app

    if (app.config.twilio_account_sid) {
        exports.twilio = require('twilio')(
            app.config.twilio_account_sid,
            app.config.twilio_auth_token
        )
    }

    return exports
}

exports.call = function(number, msg, cb) {
    return cb(new Error('Calls are not supported'))
}

exports.text = function(number, msg, cb) {
    if (exports.twilio) {
        return exports.twilio.messages.create({
            body: msg,
            to: number,
            from: exports.app.config.twilio_from
        }, cb)
    }

    debug('would text to %s: %s', number, msg)
    cb()
}
