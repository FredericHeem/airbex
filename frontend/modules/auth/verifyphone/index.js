var util = require('util')
, debug = require('../../../helpers/debug')('verifyphone')
, template = require('./index.html')
, callingcodes = require('../../../assets/callingcodes.json')
, validation = require('../../../helpers/validation')

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

    // Populate country dropdown
    $country.field().html($.map(callingcodes, function(item) {
        return util.format('<option value="%s">%s (%s)</option>',
            item.code, item.name, item.dial_code)
    }))
    
    if (api.user.country) {
    	$country.field().val(api.user.country)
    } else {
        // Guess the user's country
        var lang = api.user.language

        if (lang) {
            var countryCodeGuess = lang.substr(lang.length - 2, 2).toUpperCase()
            $country.field().val(countryCodeGuess)
        }
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
            .then(function(res) {
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
            .finally(function() {
                $phoneForm
                .removeClass('is-loading')
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
            .then(function() {
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
            .finally(function() {
                $verifyForm
                .removeClass('is-loading')
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
        .then(function() {
            $el.addClass('is-voice')
            $code.field().focus()
        })
        .fail(errors.alertFromXhr)
    })

    $number.field().focusSoon()

    function onUser(user){
        if(user){
            if(user.phone){
                $el.addClass('is-phone-verified')
            }
        }
    }

    onUser(api.user)
    api.on('user', onUser)
    return ctrl
}