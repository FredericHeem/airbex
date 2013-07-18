module.exports = function(app) {
    var routes = ['balances', 'withdraws', 'credit', 'users', 'btc', 'ltc',
        'bankaccounts', 'panic']

    routes.forEach(function(name) {
        require('./' + name)(app)
    })
}
