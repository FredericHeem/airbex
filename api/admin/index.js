module.exports = function(app) {
    var routes = ['balances', 'withdraws', 'credit', 'users', 'btc', 'ltc',
        'bankaccounts', 'panic', 'orders']

    routes.forEach(function(name) {
        require('./' + name)(app)
    })
}
