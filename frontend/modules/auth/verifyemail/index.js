var debug = require('../../../helpers/debug')('verifyemail')
, template = require('./index.html')

module.exports = function(after) {
    var $el = $('<div class=auth-verifyemail>').html(template({
        email: api.user.email
    }))
    , controller = {
        $el: $el
    }
    , timer

    $el.on('click', '.send', function(e) {
        e.preventDefault()

        var $send = $(e.target)
        .loading(true, i18n('verifyemail.send button.sending', api.user.email))

        api.call('v1/email/verify/send', {}, { type: 'POST' })
        .fail(function(err) {
            $send.loading(false)

            if (err.name == 'EmailAlreadyVerified') {
                router.go('account')
                return
            }

            if (err.name == 'EmailVerificationLockedOut') {
                alertify.alert(i18n('auth.verifyemail.locked out'), function() {
                    router.go('account')
                })
                return
            }

            errors.alertFromXhr(err)
        })
        .done(function() {
            $send
            .toggleClass('btn-success btn-primary')
            .enabled(false)
            .html(i18n('verifyemail.send button.waiting', api.user.email))

            timer = setInterval(function() {
                api.call('v1/whoami')
                .fail(function(err) {
                    debug('failed to whoami for email check')
                    debug(err)
                })
                .done(function(u) {
                    if (!u.emailVerified) return
                    api.user.emailVerified = true
                    api.user.securityLevel = 1
                    clearInterval(timer)
                    router.after(after)
                })
            }, 5e3)
        })
    })

    return controller
}
