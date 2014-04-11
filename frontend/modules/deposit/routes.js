module.exports = function(router, master, authorize) {
    return router
    .add(/^deposit$/, function() {
        router.go('deposit/bank', true)
    })
    .add(/^deposit\/bitcoin$/, function() {
        if (!authorize.user()) return
        master(require('./bitcoin')(), 'deposit')
    })
    .add(/^deposit\/litecoin$/, function() {
        if (!authorize.user()) return
        master(require('./litecoin')(), 'deposit')
    })  
    .add(/^deposit\/bank$/, function() {
        if (!authorize.user(2)) return
        master(require('./bank')(), 'deposit')
    })
    .add(/^deposit\/bank\/(USD|EUR|CHF)$/, function(currency) {
        if (!authorize.user(3)) return

        if (currency == 'USD') {
            master(require('./bank/USD')(), 'deposit')
        } else if (currency == 'EUR') {
            master(require('./bank/EUR')(), 'deposit')
        } else if (currency == 'CHF') {
            master(require('./bank/CHF')(), 'deposit')
        }
    })
}
