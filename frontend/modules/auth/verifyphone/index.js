var util = require('util')
, debug = require('../../../helpers/debug')('verifyphone')
, template = require('./index.html')
, callingcodes = require('../../../assets/callingcodes.json')
, validation = require('../../../helpers/validation')
, nav = require('../../settings/nav')

module.exports = function(after) {
    var $el = $('<div class=auth-verifyphone>').html(template())
    , ctrl = {
        $el: $el
    }
    , $phoneForm = $el.find('form.phone')
    , $country = $phoneForm.find('.country')
    , $number = $phoneForm.find('.number')
    , $verifyForm = $el.find('form.verify')
    , $code = $verifyForm.find('.code')
    , slowTimer
    , parsedNumber

    $el.find('.account-nav').replaceWith(nav('phone').$el)
    
    // Populate country dropdown
    $country.field().html($.map(callingcodes, function(item) {
        return util.format('<option value="%s">%s (%s)</option>',
            item.code, item.name, item.dial_code)
    }))

    // Guess user country from his language
    var country = 'US'
    , desired = i18n.desired ? /[a-z]{2}$/i.exec(i18n.desired) : null
    debug('desired language (from i18n): %s', desired)

    if (desired) {
        country = desired[0].toUpperCase()
        debug('country from language: %s', country)
        $country.field().val(country)
    }

    var validateNumber = validation.fromRegex($number, /^[0-9-\.,\(\) ]{1,13}$/)
    validation.monitorField($number.field(), validateNumber)

    var validatePhone = validation.fromFields({
        number: validateNumber
    })

    var validateCode = validation.fromRegex($code, /^[0-9]{4}$/)
    validation.monitorField($number.field(), validateCode)

    var validateVerify = validation.fromFields({
        code: validateCode
    })

    // Start verify
    $phoneForm.on('submit', function(e) {
        e.preventDefault()

        validatePhone(true)
        .fail(function() {
            $phoneForm.find('[type="submit"]').shake()
            $number.field().focusSoon()
        })
        .done(function(values) {
            if (values.number === null) return

            $phoneForm
            .addClass('is-loading')
            .find('fieldset').attr('disabled', '')

            return api.call('v1/users/verify/text', {
                number: values.number,
                country: $country.field().val()
            })
            .always(function() {
                $phoneForm
                .removeClass('is-loading')
            })
            .done(function(res) {
                setTimeout(function() {
                    $el.addClass('has-texted')
                    $code.field().focus()

                    // slowTimer = setTimeout(function() {
                    //     $el.addClass('is-slow')
                    // }, 10e3)

                    parsedNumber = res.number
                }, 2e3)
            })
            .fail(function(err) {
                $phoneForm
                .find('fieldset').attr('disabled', null)

                if (err.name == 'PhoneAlreadyVerified') return router.after(after)

                if (err.name == 'InvalidPhoneNumber') {
                    $number.addClass('is-invalid has-error')
                    return
                }

                if (err.name == 'LockedOut') {
                    $number.addClass('is-locked-out has-error')
                    debug('locked out: %s', err.message)
                    return
                }

                errors.alertFromXhr(err)
            })
        })
    })

    // Submit code
    $verifyForm.on('submit', function(e) {
        e.preventDefault()

        slowTimer && clearTimeout(slowTimer)
        slowTimer = null
        $el.removeClass('is-slow')

        validateVerify(true)
        .fail(function() {
            $verifyForm.find('[type="submit"]').shake()
            $code.field().focusSoon()
        })
        .done(function(values) {
            if (values.code === null) return

            $verifyForm
            .addClass('is-loading')
            .find('fieldset').attr('disabled', '')

            return api.call('v1/users/verify', {
                code: values.code
            })
            .always(function() {
                $verifyForm
                .removeClass('is-loading')
            })
            .done(function() {
                api.user.phone = parsedNumber
                api.securityLevel(2)
                $app.trigger('verifiedphone', { number: parsedNumber })
                api.trigger("user", api.user)
                alertify.log(i18n('auth.verifyphone.success log'))
                if (after) {
                  router.after(after)
                }
            })
            .fail(function(err) {
                // Code is wrong. There's no retry
                if (err.name == 'VerificationFailed') {
                    $code.addClass('is-wrong has-error')
                    return
                }

                $verifyForm
                .find('fieldset').attr('disabled', null)

                errors.alertFromXhr(err)
            })
        })
    })

    $el.on('remove', function() {
        slowTimer && clearTimeout(slowTimer)
    })

    // Fall back to voice
    $el.on('click', '[data-action="voice"]', function(e) {
        e.preventDefault()

        $el.removeClass('is-slow')

        api.call('v1/users/verify/call', {})
        .fail(errors.alertFromXhr)
        .done(function() {
            $el.addClass('is-voice')
            $code.field().focus()
        })

    })

    $number.field().focusSoon()

    api.on('user', function(user) {
        if(user){
            if(user.phone){
                $el.addClass('is-phone-verified')
            } 
        }
    })
    return ctrl
}
