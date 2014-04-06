var debug = require('debug')('snow:ripple')
, Remote = require('ripple-lib').Remote

module.exports = exports = function(app) {
    exports.app = app

    exports.remote = new Remote({
        trusted: false,
        local_signing: true,
        local_fee: true,
        fee_cusion: 1.5,
        trace: false && require('debug')('ripple').enabled,
        servers: [
            {
                host: 's1.ripple.com',
                port: 443,
                secure: true
            }
        ]
    })

    exports.remote.on('state', exports.rippleState)

    return exports
}

exports.rippleState = function(state) {
    debug('state: %s', state)

    if (state == 'offline') {
        debug('disconnected from ripple. reconnect in 5 sec')
        setTimeout(exports.connect, 5e3)
    }

    if (state == 'online') {
        debug('connected to ripple!')
    }
}


exports.connect = function() {
    debug('connecting to ripple...')
    exports.remote.connect()
}
