module.exports = function(router, master) {
    return router
    .add(/^$/, function() {
        master(require('./index')())
    })
}