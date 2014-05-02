module.exports = function(app) {
    var routes = ['balances', 'markets', 'orders', 'ripple', 'intercom',
    'currencies', 'activities', 'users', 'withdraws',
    'keys', 'resetPassword', 'spend', 'bankaccounts',
    'language', 'vouchers', 'send', 'tfa', 'transactions', 'session',
    'liability.proof', 'blockchain','purchase.orders']

    routes.forEach(function(name) {
        require('./' + name)(app)
    })

}
