module.exports = {
    configure: function(app, conn) {
        var auth = require('./auth')(conn)

        ;['balances', 'markets', 'orders', 'ripple', 'intercom',
        'currencies', 'activities', 'users', 'transfer', 'withdraws']
        .forEach(function(name) {
            require('./' + name).configure(app, conn, auth)
        })

        require('./bitcoin').configure(app, conn, auth, 'BTC')
        require('./bitcoin').configure(app, conn, auth, 'LTC')
    }
}
