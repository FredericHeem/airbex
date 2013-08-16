module.exports = function(app) {
    var routes = ['balances', 'withdraws', 'credit', 'users', 'btc', 'ltc',
        'panic', 'orders', 'transactions']

    routes.forEach(function(name) {
        require('./' + name)(app)
    })
}
