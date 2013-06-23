module.exports = {
    configure: function(app, conn) {
        var auth = require('./auth')(conn)
        , routes = ['balances', 'withdraws', 'credit', 'users', 'btc', 'ltc',
            'bankaccounts']

        routes.forEach(function(name) {
            require('./' + name).configure(app, conn, auth)
        })
    }
}
