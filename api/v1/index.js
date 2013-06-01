var tarpit = require('../tarpit')()

module.exports = {
    configure: function(app, conn) {
        app.tarpit = tarpit

        var auth = require('./auth')(conn)

        ;['balances', 'markets', 'orders', 'ripple', 'intercom',
        'currencies', 'activities', 'users', 'transfer', 'withdraws',
        'keys', 'email', 'resetPassword']
        .forEach(function(name) {
            require('./' + name).configure(app, conn, auth)
        })

        require('./bitcoin').configure(app, conn, auth, 'BTC')
        require('./bitcoin').configure(app, conn, auth, 'LTC')
    }
}
