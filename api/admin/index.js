module.exports = {
    configure: function(app, conn) {
        var auth = require('./auth')(conn)

        ;['balances', 'withdraws', 'credit', 'users', 'btc', 'ltc',
        'bankaccounts']
        .forEach(function(name) {
            require('./' + name).configure(app, conn, auth)
        })
    }
}
