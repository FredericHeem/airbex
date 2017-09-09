module.exports = function(router, master) {
    return router
    .add(/^buysell$/, function() {
        router.go('buysell/buy', true)
    })
    .add(/^buysell\/buy$/, function() {
        master(require('./buy/index')())
    })
    .add(/^buysell\/orders$/, function() {
        master(require('./orders/index')())
    })
}