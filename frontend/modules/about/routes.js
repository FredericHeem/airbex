module.exports = function(router, master, authorize) {
    return router
    .add(/^(?:about\/)?(?:company|about)$/, function() {
        master(require('./company')())
    })
    .add(/^(?:about\/)?privacy$/, function() {
        master(require('./privacy')())
    })
    .add(/^(?:about\/)?audit$/, function() {
        if (!authorize.user(2)) return
        master(require('./audit')())
    })
    .add(/^(?:about\/)?audit\/([a-zA-Z]{3,4})$/, function(currency) {
        if (!authorize.user(2)) return
        master(require('./audit/proof')(currency))
    })
    .add(/^(?:about\/)?terms$/, function() {
        master(require('./terms')())
    })
}