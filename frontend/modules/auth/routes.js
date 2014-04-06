module.exports = function(router, master, authorize) {
    return router
    .add(/^(?:auth\/)?resetpassword$/, function() {
        master(require('./resetpassword')(), 'resetpassword')
    })
    .add(/^(?:auth\/)?signOut$/, function() {
        api.logout().done(function() {
            setTimeout(function(){window.location = '/';},3000);
            
        })
    })
    .add(/^(?:auth\/)?register(?:\?after=(.+))?$/, function(after) {
        if (api.user) return router.after(after, true)
        master(require('./register')(after), 'register')
    })
    .add(/^(?:auth\/)?login(?:\?after=(.+))?$/, function(after) {
        if (api.user) return router.after(after, true)
        master(require('./login')(after ? after : "#account/funds"), 'login')
    })
    .add(/^auth\/verifyphone(?:\?after=(.+))?$/, function(after) {
        if (!authorize.user(1)) return
        if (api.user.securityLevel >= 2) return router.after(after, true)
        master(require('./verifyphone')(after), 'verifyphone')
    })
    .add(/^auth\/norwaydeposit$/, function() {
        if (!authorize.user(3)) return
        master(require('./norwaydeposit')(), 'norwaydeposit')
    })
    .add(/^auth\/cip(?:\?after=(.+))?$/, function(after) {
        if (!authorize.user(3)) return
        if (api.user.securityLevel >= 4) return router.after(after, true)
        master(require('./cip')(), 'cip')
    })
}
