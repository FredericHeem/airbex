require('../../../vendor/shake')
var _ = require('lodash')
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
    , $otp = $endForm.find('.otp')
    , $password = $endForm.find('.password')
    , $submit = $endForm.find('button')

    function validateOtp() {
        var expression = /^[0-9]{6}$/
        , valid = $otp.field('otp').val().match(expression)

        $otp
        .removeClass('is-wrong is-locked-out')
        .toggleClass('is-invalid has-error', !valid)
        .toggleClass('is-valid', !!valid)

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
                    'and cannot reset password. Contact ' + window.config.email_support)
                return
            }

            if (err.name == 'NoVerifiedPhone') {
                alertify.alert('Sorry, but your user has no verified phone ' +
                    'and cannot reset password. Contact ' + window.config.email_support)
                return
            }

            if (err.name == 'UserNotFound') {
                alertify.alert('Sorry, but the user ' + email + ' was not found.')
                return
            }

            if (err.name == 'ResetPasswordLockedOut') {
                alertify.alert('Sorry, but you tried to reset your password ' +
                    'not long ago. Try again later or contact ' + window.config.email_support)
                return
            }

            errors.alertFromXhr(err)
        })
        .then(function(res) {
            $button.html('Check your email').removeClass('btn-primary')
            if(!res.has2fa){
                $(".otp").hide()
            }
            if(res.hasPhone){
                setTimeout(function() {
                    $begin.fadeTo(1000, 0.75)
                    $phone.show()
                    $phoneCode.focusSoon()

                }, 10e3)
            } else {
                setTimeout(function() {
                    $begin.fadeTo(1000, 0.75)

                    $end.show()
                    $password.focusSoon()
                }, 10e3)
            }
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
        var phoneCode = $phoneCode.find('input').val()
        var twaFaCode = $otp.find('input').val()

        var fields = [$password]
        var useOtp = $endForm.find('.otp:visible').length

        validatePassword()

        if (useOtp) {
            validateOtp()
            fields.push($otp)
        }
        var invalid = false
        _.some(fields, function($e) {
            if ($e.hasClass('is-valid')) return
            $submit.shake()
            $e.find('input').focus()
            invalid = true
            return true
        })

        if (invalid) return
        
        api.resetPasswordEnd(email, phoneCode, password, twaFaCode)
        .fail(function(err){
            if (err.name == 'MustConfirmEmailFirst') {
                alertify.alert('Please click on the link sent in the email.')
                return
            } 
            errors.alertFromXhr(err)
            
        })
        .done(function() {
            // TODO: i18n
            alert('Reset complete')
            window.location = '/'
        })
    })

    $email.find('input').focusSoon()

    return controller
}
