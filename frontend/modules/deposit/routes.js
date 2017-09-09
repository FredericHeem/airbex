var _ = require('lodash')

module.exports = function(router, master, authorize) {
	router.add(/^deposit$/, function() {
        router.go('deposit/BTC', true)
    })
    .add(/^deposit\/([A-Z]{3,4})$/, function(currency) {
        master(require('./crypto')(currency))
    })
    .add(/^deposit\/bank$/, function() {
        if (!authorize.user(2)) return
        master(require('./bank')(), 'deposit')
    })
    .add(/^deposit\/voucher/, function() {
        if (!authorize.user()) return
        master(require('./voucher')(), 'deposit')
    })
    .add(/^deposit\/ccc\/([A-Z]{3,4})/, function(currency) {
        if (!authorize.user()) return
        master(require('./bank/CCC')(currency), 'deposit')
    })
    .add(/^deposit\/bank\/(USD|EUR|CZK)$/, function(currency) {
        if (!authorize.user(3)) return

        if (currency == 'USD') {
            master(require('./bank/USD')(), 'deposit')
        } else if (currency == 'EUR') {
            master(require('./bank/EUR')(), 'deposit')
        } else if (currency == 'CZK') {
            master(require('./bank/CZK')(), 'deposit')
        }
    })
}
