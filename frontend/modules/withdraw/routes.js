var sepa = require('../../assets/sepa.json')
, wire = require('../../assets/wire.json')

module.exports = function(router, master, authorize) {
    return router
    .add(/^withdraw$/, function() {
        if (!authorize.user()) return
        router.go('withdraw/withdraws', true)
    })
    .add(/^withdraw\/bitcoin$/, function() {
        if (!authorize.user()) return
        master(require('./bitcoin')(), 'withdraw')
    })
    .add(/^withdraw\/litecoin$/, function() {
        if (!authorize.user()) return
        master(require('./litecoin')(), 'withdraw')
    })
    .add(/^withdraw\/bank$/, function() {
        if (!authorize.user(3)) return

        // Only require level 4 security if the user is actually
        // allowed to withdraw to a bank account.
        var allowed = ~sepa.indexOf(api.user.country) || ~wire.indexOf(api.user.country)
        if (allowed &&!authorize.user(4)) return

        master(require('./bank')(), 'withdraw')
    })

    .add(/^withdraw\/withdraws$/, function() {
        if (!authorize.user()) return
        master(require('./withdraws')(), 'withdraw')
    })
}
