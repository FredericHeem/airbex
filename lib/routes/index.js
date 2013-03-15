var db = require('../db')

module.exports = function(app) {
    var config = require('konfu')
    , conn = db(config.pg_url, config.pg_native)

    var Users = require('./users')
    , users = new Users(conn)
    users.configure(app)

    require('./accounts').configure(app)
    require('./books').configure(app)
    require('./securities').configure(app)
    require('./orders').configure(app)
    require('./rippleout').configure(app)

    var config = require('konfu')
    , BitcoinEdge = require('./bitcoinedge')
    , bitcoinEdge = new BitcoinEdge({
        securityId: 'BTC'
    })
    bitcoinEdge.configure(app)
}
