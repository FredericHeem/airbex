require('../../../vendor/shake')

var _ = require('lodash')
, debug = require('../../../helpers/debug')('login')
, template = require('./index.html')

module.exports = function(after) {
    var controller = {
        $el: $('<div class=auth-login>').html(template())
    }
    , $form = controller.$el.find('.login')
    , $email = $form.find('.form-group.email')
    , $password = $form.find('.form-group.password')
    , $otp = $form.find('.otp')
    , $submit = $form.find('button')
    , validatePasswordTimer
    , validateEmailTimer

    $email.add($password)
    .on('keyup', function(e) {
        if (e.which == 13 || e.which == 9) return

        // Revert to the original hint
        var group = $(this).closest('.form-group')
        group.removeClass('has-error warning success is-valid')
        .find('.help-block')
        .empty()
    })

    if (after) {
        controller.$el.find('.new-user').attr('href', '#register?after=' + after)
    }

    function validateOtp() {
        var otp = $form.find('.otp')
        , expression = /^[0-9]{6}$/
        , valid = otp.field('otp').val().match(expression)

        $otp
        .removeClass('is-wrong is-locked-out')
        .toggleClass('is-invalid has-error', !valid)
        .toggleClass('is-valid', !!valid)

        return valid
    }

    function validateEmail() {
        var email = $email.find('input').val()
        , expression = /^\S+@\S+$/
        , $hint = $email.find('.help-block')

        var valid = !!email.match(expression)

        if (email.length === 0 || valid) {
            $email.removeClass('has-error')
            if (valid) $email.addClass('success')
            $hint.empty()
        } else {
            $email.removeClass('success').addClass('has-error')
            $hint.empty()
        }

        $email.toggleClass('is-valid', valid)

        return valid
    }

    function validatePassword() {
        var password = $password.find('input').val()
        , $hint = $password.find('.help-block')

        var valid = password.length >= 6

        if (password.length === 0 || valid) {
            $password.removeClass('has-error')
            if (valid) $password.addClass('success')
            $hint.empty()
        } else {
            $password.removeClass('success').addClass('has-error')
        }

        $password.toggleClass('is-valid', valid)

        return valid
    }

    $email.on('change keyup blur', 'input', function(e) {
        if (e.which == 9) return
        validateEmailTimer && clearTimeout(validateEmailTimer)
        validateEmailTimer = setTimeout(function() {
            validateEmail()
        }, 750)
    })

    $password.on('change keyup blur', 'input', function(e) {
        if (e.which == 9) return
        validatePasswordTimer && clearTimeout(validatePasswordTimer)
        validatePasswordTimer = setTimeout(function() {
            validatePassword()
        }, 750)
    })

    function login() {
        $.removeCookie('session', { path: '/' })

        return api.login($email.find('input').val(), $password.find('input').val())
        .always(function() {
            $submit.prop('disabled', false)
            .removeClass('is-loading')
            .html(i18n('login.login button'))
        }).done(function() {
            debug('login success')
            router.after(after)
        }).fail(function(err) {
            if (err !== null && err.name == 'SessionNotFound') {
                $email
                .addClass('has-error')
                .find('.help-block')
                .html(i18n('login.errors.wrong username or password'))
                return
            }

            if (err.name == 'OtpRequired') {
                $form.find('.otp').show()
                $form.field('otp').focus()
                return
            }

            errors.alertFromXhr(err)
        })
    }

    function submitOtp() {
        return api.twoFactor(
            $email.find('input').val(),
            $password.find('input').val(),
            $form.field('otp').val()
        )
        .fail(function(err) {
            if (err.name == 'WrongOtp') {
                $otp.addClass('is-wrong has-error')
                $otp.field().focus()
                return
            }

            if (err.name == 'BlockedOtp') {
                $otp.addClass('is-locked-out has-error')
                $otp.field().focus()
                return
            }

            // Backend has restarted/client has timed out
            if (err.name == 'SessionNotFound') {
                window.location = '/'
                return
            }

            errors.alertFromXhr(err)
        })
        .done(function() {
            router.after(after)
        })
    }

    $form.on('submit', function(e) {
        var useOtp = $form.find('.otp:visible').length

        e.preventDefault()

        validateEmail()
        validatePassword()

        var fields = [$email, $password]
        , invalid


        if (useOtp) {
            validateOtp()
            fields.push($form.find('.otp'))
        }

        _.some(fields, function($e) {
            if ($e.hasClass('is-valid')) return
            $submit.shake()
            $e.find('input').focus()
            invalid = true
            return true
        })

        if (invalid) return

        $submit.loading(true, i18n('login.login button.logging in'))

        debug('logging in')

        var method = useOtp ? submitOtp : login

        method().always(function() {
            $submit.loading(false)
        })
    })

    $email.find('input').focusSoon()

    return controller
}
