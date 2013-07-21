var Tropo = require('tropo')

module.exports = exports = function(app) {
    exports.tropo = new Tropo({
        voiceToken: app.config.tropo_voice_token,
        messagingToken: app.config.tropo_messaging_token
    })

    return exports
}

exports.say = function(number, text, cb) {
    exports.tropo.call(number, text, cb)
}
