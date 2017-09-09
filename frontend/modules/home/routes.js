module.exports = function(router, master) {
    return router
    .add(/^dashboard$/, function() {
        master(require('./index')())
    })
}