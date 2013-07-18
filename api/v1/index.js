var tarpit = require('../tarpit')()

module.exports = function(app, conn) {
    app.tarpit = tarpit

    var auth = require('./auth')(conn)
    , routes = ['balances', 'markets', 'orders', 'ripple', 'intercom',
    'currencies', 'activities', 'users', 'withdraws',
    'keys', 'email', 'resetPassword', 'spend', 'bankaccounts',
    'language', 'vouchers', 'send']

    routes.forEach(function(name) {
        require('./' + name)(app, conn, auth)
    })

    require('./bitcoin')(app, conn, auth, 'BTC')
    require('./bitcoin')(app, conn, auth, 'LTC')
}
