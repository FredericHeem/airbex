var debug = require('./util/debug')('snow:entry')

debug('initializing shared components')

window.$app = $('body')
window.router = require('./util/router')
window.api = require('./api')
window.errors = require('./errors')
window.numbers = require('./util/numbers')

debug('shared components inited')

require('./helpers/jquery')
require('./routes')()

api.on('user', function(user) {
    $app.toggleClass('is-logged-in', !!user)
    $app.toggleClass('is-admin', user && user.admin)
})

api.bootstrap().done(function() {
    var apiKey = $.cookie('apiKey')

    var master = require('./controllers/master')
    master.render()

    if (apiKey) {
        debug('using cached credentials')
        api.loginWithKey(apiKey)
        .done(router.now)
    } else {
        debug('no cached credentials')

        if ($.cookie('existingUser')) {
            debug('routing to login (existing user cookie)')
            require('./authorize').admin()
        } else {
            debug('routing')
            router.now()
        }
    }
})
