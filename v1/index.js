module.exports = {
    configure: function(app, conn, auth) {
        var auth = require('./auth')(conn);

        ['balances', 'markets', 'orders', 'ripple', 'intercom',
        'currencies', 'activities', 'users', 'transfer']
        .forEach(function(name) {
            require('./' + name).configure(app, conn, auth)
        })

        require('./bitcoin').configure(app, conn, auth, 'BTC')
        require('./bitcoin').configure(app, conn, auth, 'LTC')
    }
}
