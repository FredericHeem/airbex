module.exports = {
    configure: function(app, conn) {
        var auth = require('./auth')(conn)
        , routes = ['balances', 'withdraws', 'credit', 'users', 'btc', 'ltc',
            'bankaccounts', 'panic']

        routes.forEach(function(name) {
            var router = require('./' + name)
            , configure = router.configure || router
            configure(app, conn, auth)
        })
    }
}
