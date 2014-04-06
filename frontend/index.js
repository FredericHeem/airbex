var debug = require('./helpers/debug')('snow:entry')

require('./helpers/framekiller')()

debug('initializing shared components')

window.$app = $('body')
window.router = require('./helpers/router')
window.api = require('./api')
window.errors = require('./errors')
window.i18n = require('./i18n')
window.numbers = require('./helpers/numbers')
window.formatters = require('./helpers/formatters')
window.moment = require('moment')
window.autologout = require('./helpers/autologout')()
window.loading = require('./helpers/loading')()
debug('shared components inited')

i18n.detect()

require('./helpers/jquery')
require('./routes.js')()
//require('./helpers/intercom')

if (window.analytics) {
    require('./segment')
}

api.on('user', function(user) {
    $app.toggleClass('is-logged-in', !!user)
    $app.toggleClass('is-admin', user && user.admin)

    debug('user has changed')

    if (user.language) {
        debug('user has a language, %s, setting it on i18n', user.language)
        i18n.set(user.language)
    }

    if (!user.language && i18n.desired) {
        debug('user has no language, i18n has desired. patching user')

        api.patchUser({ language: i18n.desired })
        .fail(errors.reportFromXhr)
    }
})

$app.on('click', 'a[href="#set-language"]', function(e) {
    e.preventDefault()
    i18n.set($(this).attr('data-language'))
})

debug('boostrapping...')

api.bootstrap()
.fail(function(err) {
    errors.alertFromXhr(err)

    debug('reloading window after alert (bootstrap failed) in 10 sec')

    setTimeout(function() {
        window.location.reload()
    }, 10e3)
})
.then(function() {
    var verifyCode = location.hash.match(/^#([a-z0-9]{20})$/)
    if (!verifyCode) return
    location.hash = ''
    debug('the user is verifying email to complete registration')

    return api.call('v1/users/verify/' + verifyCode[1], {})
    .then(null, function(err) {
        if (err.name == 'UnknownEmailVerifyCode') {
            debug('trying to recover from unknown code (ignore)')
            return $.Deferred().resolve()
        }

        return err
    })
    .then(function() {
        var userKey = $.cookie('register.userKey')
        if (userKey) {
            var email = $.cookie('register.email')
            debug('can auto-login user %s from user key from registration', email)
            $.removeCookie('register.userKey')
            $.removeCookie('register.email')
            return api.loginWithUserKey(email, userKey)
        }

        debug('theres no user key. redirecting to login')

        // TODO: i18n
        alertify.log('Your email has been verified!')
        $.cookie('existingUser', true)
    })
    .fail(errors.alertFromXhr)
})
.done(function() {
    debug('boostrapping successful')

    var master = require('./modules/master')
    master.render()

    if ($.cookie('session')) {
        debug('using existing session')
        api.loginWithKey()
        .fail(function() {
            $.removeCookie('session')
            debug('failed to reuse existing session')
            router.now()
        })
        .done(router.now)
    } else {
        debug('no existing session')

        if ($.cookie('existingUser')) {
            debug('routing to login (existing user cookie)')
            //require('./authorize').user()
            router.now()
        } else {
            debug('routing')
            router.now()
        }
    }
})
