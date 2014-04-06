var debug = require('./helpers/debug')('snow:entry')

debug('initializing shared components')

window.$app = $('body')
window.router = require('./helpers/router')
window.api = require('./api')
window.errors = require('./errors')
window.numbers = require('./helpers/numbers')
window.moment = require('moment')

debug('shared components inited')

require('./helpers/jquery')
require('./routes')()

api.on('user', function(user) {
    $app.toggleClass('is-logged-in', !!user)
    $app.toggleClass('is-admin', user && user.admin)
})

api.bootstrap()
.done(function() {
    var master = require('./controllers/master')
    master.render()

    if ($.cookie('session')) {
        debug('using cached credentials')
        api.whoami().done(router.now)
    } else {
        debug('no cached credentials')

        require('./authorize').admin()
    }
})
.fail(function(err) {
    debug('reloading window after alert (bootstrap failed)')
    errors.alertFromXhr(err)

    setTimeout(function() {
        location.reload()
    }, 10e3)
})
