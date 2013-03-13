module.exports = function(app) {
    require('./users').configure(app)
    require('./accounts').configure(app)
    require('./books').configure(app)
    require('./securities').configure(app)
    require('./orders').configure(app)
    require('./rippleout').configure(app)

    var config = require('konfu')
    , BitcoinEdge = require('./bitcoinedge')
    , bitcoinEdge = new BitcoinEdge({
        endpoint: {
            host: config.btc_host,
            port: config.btc_port,
            user: config.btc_user,
            pass: config.btc_pass
        },
        securityId: 'BTC'
    })
    bitcoinEdge.configure(app)
}
