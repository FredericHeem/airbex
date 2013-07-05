var tarpit = require('../tarpit')()

module.exports = {
    configure: function(app, conn) {
        app.tarpit = tarpit

        var auth = require('./auth')(conn)
        , routes = ['balances', 'markets', 'orders', 'ripple', 'intercom',
        'currencies', 'activities', 'users', 'withdraws',
        'keys', 'email', 'resetPassword', 'spend', 'bankaccounts',
        'language', 'vouchers', 'send']

        routes.forEach(function(name) {
            require('./' + name).configure(app, conn, auth)
        })

        require('./bitcoin').configure(app, conn, auth, 'BTC')
        require('./bitcoin').configure(app, conn, auth, 'LTC')
    }
}
