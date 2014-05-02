module.exports = function(app) {
    var routes = ['balances', 'withdraws', 'credit', 'users', 'btc', 'ltc',
        'panic', 'orders', 'transactions', 'purchase.order']

    routes.forEach(function(name) {
        require('./' + name)(app)
    })
}
