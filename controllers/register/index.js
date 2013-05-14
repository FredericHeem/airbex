require('../../vendor/shake')

module.exports = function(app, api) {
    var controller = {
        $el: $(require('./template.html')())
    }
    , i18n = app.i18n
    , $form = controller.$el.find('.register')
    , $email = $form.find('.control-group.email')
    , $password = $form.find('.control-group.password')
    , $repeat = $form.find('.control-group.repeat')
    , $submit = $form.find('button')
    , $validation = $form.find('.validation')
    $email.find('.help-inline').html(i18n('register.hints.email'))
    $password.find('.help-inline').html(i18n('register.hints.password'))
    $repeat.find('.help-inline').html(i18n('register.hints.repeat'))

    $email.add($repeat).add($password)
    .on('focus keyup', 'input', function() {
        // Show initial hint on focus
        $(this)
        .closest('.control-group')
        .find('.help-inline')
        .css('visibility', 'visible')
    })
    .on('keyup', function(e) {
        if (e.which == 13 || e.which == 9) return

        // Revert to the original hint
        var group = $(this).closest('.control-group')
        group.removeClass('error warning success is-valid')
        .find('.help-inline')
        .html(i18n('register.hints.' + group.find('input').attr('name')))
    })

    function validateEmail() {
        var email = $email.find('input').val()
        , expression = /^\S+@\S+$/
        , $hint = $email.find('.help-inline')

        var valid = !!email.match(expression)

        if (valid) {
            $email.removeClass('error').addClass('success')
            $hint.html(i18n('register.successes.email'))
        } else {
            $email.removeClass('success').addClass('error')
            $hint.html(i18n('register.errors.email.badFormat'))
        }

        $email.toggleClass('is-valid', valid)

        return valid
    }

    function validatePassword() {
        var password = $password.find('input').val()
        , $hint = $password.find('.help-inline')

        var valid = password.length >= 6

        if (valid) {
            $password.removeClass('error').addClass('success')
            $hint.html(i18n('register.successes.password'))
        } else {
            $password.removeClass('success').addClass('error')
            $hint.html(i18n('register.errors.password.tooShort'))
        }

        $password.toggleClass('is-valid', valid)

        return valid
    }

    function validateRepeat() {
        var repeat = $repeat.find('input').val()
        , $hint = $repeat.find('.help-inline')
        , password = $password.find('input').val()

        if (!$password.hasClass('is-valid')) {
            $repeat.removeClass('success error is-valid')
            $hint.html('')
            return
        }

        var valid = repeat == password

        if (valid) {
            $repeat.removeClass('error').addClass('success')
            $hint.html(i18n('register.successes.repeat'))
        } else {
            $repeat.removeClass('success').addClass('error')
            $hint.html(i18n('register.errors.repeat.notSame'))
        }

        $repeat.toggleClass('is-valid', valid)

        return valid
    }

    ;(function() {
        var timer
        $email.on('change keyup blur', 'input', function(e) {
            if (e.which == 9) return
            timer && clearTimeout(timer)
            timer = setTimeout(function() {
                validateEmail()
            }, 750)
        })
    })()

    ;(function() {
        var timer
        $password.on('change keyup blur', 'input', function(e) {
            if (e.which == 9) return
            timer && clearTimeout(timer)
            timer = setTimeout(function() {
                validatePassword()
                validateRepeat()
            }, 750)
        })
    })()

    ;(function() {
        var timer
        $repeat.on('change keyup blur', 'input', function(e) {
            if (e.which == 9) return
            timer && clearTimeout(timer)
            timer = setTimeout(function() {
                validateRepeat()
            }, 750)
        })
    })()

    $form.on('submit', function(e) {
        e.preventDefault()

        validateEmail()
        validatePassword()
        validateRepeat()

        var fields = [$email, $password, $repeat]
        , invalid

        fields.some(function($e) {
            if ($e.hasClass('is-valid')) return
            $submit.shake()
            $e.find('input').focus()
            return invalid = true
        })

        if (invalid) return

        $submit.prop('disabled', true)
        .addClass('is-loading')
        .html(i18n('register.create button.creating'))

        api.register($email.find('input').val(), $password.find('input').val())
        .always(function() {
            $submit.prop('disabled', false)
            .removeClass('is-loading')
            .html(i18n('register.create button'))
        }).done(function() {
            window.location.hash = '#dashboard'
        }).fail(function(xhr) {
            var err = app.errorFromXhr(xhr)

            if (err.name == 'EmailFailedCheck') {
                $email.find('input').focus()

                $email
                .removeClass('success')
                .addClass('error')
                .find('.help-inline')
                .html(i18n('register.errors.email.checkFailed'))

                $submit.shake()
                return
            }

            alert(JSON.stringify(err, null, 4))
        })
    })

    setTimeout(function() {
        $email.find('input').focus()
    }, 250)

    return controller
}
