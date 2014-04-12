module.exports = function(router, master, authorize) {
    return router
    .add(/^deposit$/, function() {
        router.go('deposit/bank', true)
    })
    .add(/^deposit\/bitcoin$/, function() {
        if (!authorize.user()) return
        master(require('./bitcoin')(), 'deposit')
    })
    .add(/^deposit\/logos$/, function() {
        if (!authorize.user()) return
        master(require('./logos')(), 'deposit')
    })
}
