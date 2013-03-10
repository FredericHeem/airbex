module.exports = function(app) {
    require('./users').configure(app)
    require('./accounts').configure(app)
    require('./books').configure(app)
    require('./securities').configure(app)
    require('./orders').configure(app)
    require('./rippleout').configure(app)

    var config = require('../../config')
    , BitcoinEdge = require('./bitcoinedge')
    , bitcoinEdge = new BitcoinEdge({
        endpoint: {
            host: config.BTC_HOST,
            port: config.BTC_PORT,
            user: config.BTC_USER,
            pass: config.BTC_PASS
        },
        securityId: 'BTC'
    })
    bitcoinEdge.configure(app)
}
