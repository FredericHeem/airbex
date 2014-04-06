require('../../../vendor/shake')

var _ = require('lodash')
, validateEmailTimer
, validatePasswordTimer
, validateRepeatTimer
, template = require('./index.html')

module.exports = function(after) {
    var $el = $('<div class=auth-register>').html(template())
    , controller = {
        $el: $el
    }
    , $form = $el.find('.register-form')
    , $email = $form.find('.form-group.email')
    , $password = $form.find('.form-group.password')
    , $repeat = $form.find('.form-group.repeat')
    , $submit = $form.find('button')

    $email.find('.help-block').html(i18n('register.hints.email'))
    $password.find('.help-block').html(i18n('register.hints.password'))
    $repeat.find('.help-block').html(i18n('register.hints.repeat'))

    if (after) {
        $el.find('.existing').attr('href', '#login?after=' + after)
    }

    $email.add($repeat).add($password)
    .on('focus keyup', 'input', function() {
        // Show initial hint on focus
        $(this)
        .closest('.form-group')
        .find('.help-block')
        .css('visibility', 'visible')
    })
    .on('keyup', function(e) {
        if (e.which == 13 || e.which == 9) return

        // Revert to the original hint
        var group = $(this).closest('.form-group')
        group.removeClass('has-error warning success is-valid')
        .find('.help-block')
        .html(i18n('register.hints.' + group.find('input').attr('name')))
    })

    function validateEmail() {
        var email = $email.find('input').val()
        , expression = /^\S+@\S+$/
        , $hint = $email.find('.help-block')

        var valid = !!email.match(expression)

        if (valid) {
            $email.removeClass('has-error').addClass('success')
            $hint.html(i18n('register.successes.email'))
        } else {
            $email.removeClass('success').addClass('has-error')
            $hint.html(i18n('register.errors.email.badFormat'))
        }

        $email.toggleClass('is-valid', valid)

        return valid
    }

    function validatePassword() {
        var password = $password.find('input').val()
        , $hint = $password.find('.help-block')

        var valid = password.length >= 6

        if (valid) {
            $password.removeClass('has-error').addClass('success')
            $hint.html(i18n('register.successes.password'))
        } else {
            $password.removeClass('success').addClass('has-error')
            $hint.html(i18n('register.errors.password.tooShort'))
        }

        $password.toggleClass('is-valid', valid)

        return valid
    }

    function validateRepeat() {
        var repeat = $repeat.find('input').val()
        , $hint = $repeat.find('.help-block')
        , password = $password.find('input').val()

        if (!$password.hasClass('is-valid')) {
            $repeat.removeClass('success error is-valid')
            $hint.html('')
            return
        }

        var valid = repeat == password

        if (valid) {
            $repeat.removeClass('has-error').addClass('success')
            $hint.html(i18n('register.successes.repeat'))
        } else {
            $repeat.removeClass('success').addClass('has-error')
            $hint.html(i18n('register.errors.repeat.notSame'))
        }

        $repeat.toggleClass('is-valid', valid)

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
            validateRepeat()
        }, 750)
    })

    $repeat.on('change keyup blur', 'input', function(e) {
        if (e.which == 9) return
        validateRepeatTimer && clearTimeout(validateRepeatTimer)
        validateRepeatTimer = setTimeout(function() {
            validateRepeat()
        }, 750)
    })

    $form.on('submit', function(e) {
        e.preventDefault()

        validateEmail()
        validatePassword()
        validateRepeat()

        var $terms = $el.find('.terms').toggleClass('has-error',
            !$el.field('terms').prop('checked'))
        $terms.toggleClass('is-valid', !$terms.hasClass('has-error'))

        var fields = [$email, $password, $repeat, $terms]
        , invalid

        _.some(fields, function($e) {
            if ($e.hasClass('is-valid')) return
            $submit.shake()
            $e.find('input').focus()
            invalid = true
            return
        })

        if (invalid) return

        $submit.prop('disabled', true)
        .addClass('is-loading')
        .html(i18n('register.create button.creating'))

        register()
    })

    function register() {
        var email = $email.find('input').val()
        , password = $password.find('input').val()

        api.register(email, password)
        .always(function() {
            $submit.prop('disabled', false)
            .removeClass('is-loading')
            .html(i18n('register.create button'))
        }).done(function() {
            $el.addClass('has-submitted')
            $.cookie('register.userKey', api.getUserKey(email, password))
            $.cookie('register.email', email)
            $el.find('.submitted .instruction').html(i18n('auth.register.submitted.instruction', _.escape(email)))
        }).fail(function(err) {
            if (err.name == 'EmailFailedCheck') {
                $email.find('input').focus()

                $email
                .removeClass('success')
                .addClass('has-error')
                .find('.help-block')
                .html(i18n('register.errors.email.checkFailed'))

                $submit.shake()
                return
            }

            if (err.name == 'EmailAlreadyInUse') {
                $email.find('input').focus()

                $email
                .removeClass('success')
                .addClass('has-error')
                .find('.help-block')
                .html(i18n('register.errors.email.alreadyInUse'))

                $submit.shake()
                return
            }
            errors.alertFromXhr(err)
        })
    }

    $email.find('input').focusSoon()

    // Prevent the user from being redirected to login if reloadng the browser
    $.removeCookie('existingUser', { path: '/' })

    return controller
}
