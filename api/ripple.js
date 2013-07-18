var debug = require('debug')('snow:ripple')
, Drop = require('drop')

module.exports = exports = function(app) {
    exports.app = app
}

exports.connect = function() {
    debug('connecting to ripple...')

    exports.drop = new Drop(function() {
        debug('connected to ripple')
    })

    exports.drop.on('close', function() {
        debug('disconnected from ripple. reconnecting in 10 sec')
        setTimeout(exports.connect, 10e3)
    })
}
