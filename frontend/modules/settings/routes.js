module.exports = function(router, master, authorize) {
    return router
    .add(/^settings$/, function() {
        router.go('settings/profile', true)
    })
    .add(/^settings\/changepassword$/, function() {
        if (!authorize.user()) return
        master(require('./changepassword')(), 'settings')
    })
    .add(/^settings\/profile(?:\?after=(.+))?$/, function(after) {
        if (!authorize.user()) return
        master(require('./profile')(after), 'settings')
    })
    .add(/^settings\/phone(?:\?after=(.+))?$/, function(after) {
        if (!authorize.user()) return
        master(require('../auth/verifyphone')(after), 'settings')
    })
    .add(/^settings\/identity$/, function() {
        if (!authorize.user()) return
        master(require('./identity')(), 'settings')
    })
    .add(/^settings\/username$/, function() {
        if (!authorize.user()) return
        master(require('./username')(), 'settings')
    })
    .add(/^settings\/twofactor$/, function() {
        if (!authorize.user()) return
        master(require('./twofactor')(), 'settings')
    })
    .add(/^settings\/apikeys$/, function() {
        if (!authorize.user(3)) return
        master(require('./apikeys')(), 'settings')
    })
}
