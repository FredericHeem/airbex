var sepa = require('../../assets/sepa.json')
, wire = require('../../assets/wire.json')

module.exports = function(router, master, authorize) {
    return router
    .add(/^withdraw$/, function() {
        if (!authorize.user()) return
        router.go('withdraw/withdraws', true)
    })
    .add(/^withdraw\/([A-Z]{3,4})$/, function(currency) {
        master(require('./crypto')(currency))
    })

    .add(/^withdraw\/bank$/, function() {
        if (!authorize.user()) return
        // Only require level 4 security if the user is actually
        // allowed to withdraw to a bank account.
        //var allowed = ~sepa.indexOf(api.user.country) || ~wire.indexOf(api.user.country)
        //if (allowed &&!authorize.user(4)) return

        master(require('./bank')(), 'withdraw')
    })
    .add(/^withdraw\/email/, function() {
        master(require('./email')())
    })
    .add(/^withdraw\/voucher$/, function() {
        master(require('./voucher')())
    })
    .add(/^withdraw\/withdraws$/, function() {
        if (!authorize.user()) return
        master(require('./withdraws')(), 'withdraw')
    })
}
