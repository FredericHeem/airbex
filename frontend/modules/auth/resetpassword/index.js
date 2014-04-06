require('../../../vendor/shake')

var template = require('./index.html')

module.exports = function() {
    var $el = $('<div class=auth-resetpassword>').html(template())
    , controller = {
        $el: $el
    }
    , email
    , phoneCode
    , $begin = $el.find('.begin')
    , $beginForm = $begin.find('.begin-form')
    , $email = $beginForm.find('.email')
    , $phone = $el.find('.phone')
    , $phoneForm = $phone.find('.phone-form')
    , $end = $el.find('.end')
    , $endForm = $end.find('.end-form')
    , $phoneCode = $phoneForm.find('.code')
    , $password = $endForm.find('.password')

    $beginForm.on('submit', function(e) {
        e.preventDefault()

        email = $email.find('input').val()

        var $button = $beginForm.find('.submit')
        $email.find('input').enabled(false)
        $button.html('Emailing you...').loading(true)

        api.call('v1/resetPassword', { email: email }, { type: 'POST' })
        .fail(function(err) {
            $button.html('Email me').loading(false)
            $email.find('input').enabled(false)

            if (err.name == 'NoVerifiedEmail') {
                alertify.alert('Sorry, but your user has no verified email ' +
                    'and cannot reset password. Contact support@sbex.ch')
                return
            }

            if (err.name == 'NoVerifiedPhone') {
                alertify.alert('Sorry, but your user has no verified phone ' +
                    'and cannot reset password. Contact support@sbex.ch')
                return
            }

            if (err.name == 'UserNotFound') {
                alertify.alert('Sorry, but the user ' + email + ' was not found.')
                return
            }

            if (err.name == 'ResetPasswordLockedOut') {
                alertify.alert('Sorry, but you tried to reset your password ' +
                    'not long ago. Try again later or contact support@sbex.ch.')
                return
            }

            errors.alertFromXhr(err)
        })
        .done(function() {
            $button.html('Check your email').removeClass('btn-primary')

            setTimeout(function() {
                $begin.fadeTo(1000, 0.75)
                $phone.show()
                $phoneCode.focusSoon()

            }, 15e3)
        })
    })

    $phoneForm.on('submit', function(e) {
        e.preventDefault()

        phoneCode = $phoneCode.find('input').val()

        if (!phoneCode.match(/^\d{4}$/)) {
            return alert('Phone code must be 4 digits')
        }

        $phoneCode.add($phoneForm.find('button')).enabled(false)
        $phone.fadeTo(1000, 0.75)
        $end.show()
        $password.focusSoon()
    })

    $endForm.on('submit', function(e) {
        e.preventDefault()

        var password = $password.find('input').val()

        api.resetPasswordEnd(email, phoneCode, password)
        .fail(errors.alertFromXhr)
        .done(function() {
            // TODO: i18n
            alert('Reset complete. Please do not forget your password again.')
            window.location = '/'
        })
    })

    $email.find('input').focusSoon()

    return controller
}
