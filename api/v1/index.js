module.exports = function(app) {
    var routes = ['balances', 'markets', 'orders', 
    'currencies', 'activities', 'users', 'withdraws',
    'keys', 'resetPassword', 'spend', 'bankaccounts',
    'language', 'vouchers', 'send', 'tfa', 'transactions', 'session',
    'liability.proof']

    routes.forEach(function(name) {
        require('./' + name)(app)
    })

}
