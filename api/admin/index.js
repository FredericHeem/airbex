module.exports = function(app, conn) {
    var auth = require('./auth')(conn)
    , routes = ['balances', 'withdraws', 'credit', 'users', 'btc', 'ltc',
        'bankaccounts', 'panic']

    routes.forEach(function(name) {
        require('./' + name)(app, conn, auth)
    })
}
