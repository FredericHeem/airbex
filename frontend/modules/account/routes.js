module.exports = function(router, master, authorize) {
    return router
    .add(/^$/, function() {
        router.go('account', true)
    })
    .add(/^account$/, function() {
        router.go('account/funds', true)
    })
    .add(/^account\/funds$/, function() {
        if (!authorize.user()) return
        master(require('./funds')(), 'account')
    })
    .add(/^account\/vouchers$/, function() {
        if (!authorize.user()) return
        master(require('./vouchers')(), 'account')
    })
    .add(/^account\/activity$/, function() {
        if (!authorize.user()) return
        master(require('./activity')(), 'account')
    })
    .add(/^account\/transactions(?:\/(\d+))?$/, function(skip) {
        if (!authorize.user()) return
        master(require('./transactions')(+skip || 0), 'account')
    })
    .add(/^account\/bankaccounts$/, function() {
        if (!authorize.user()) return
        master(require('./bankaccounts')(), 'account')
    })
    .add(/^account\/bankaccounts\/add$/, function() {
        if (!authorize.user()) return
          master(require('./bankaccounts/add')(), 'account')
    })
}
