module.exports = function(app) {
    var routes = ['balances', 'markets', 'orders', 'ripple', 'intercom',
    'currencies', 'activities', 'users', 'withdraws',
    'keys', 'email', 'resetPassword', 'spend', 'bankaccounts',
    'language', 'vouchers', 'send']

    routes.forEach(function(name) {
        require('./' + name)(app)
    })

    require('./bitcoin')(app, 'BTC')
    require('./bitcoin')(app, 'LTC')
}
