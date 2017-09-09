var util = require('util')
, _ = require('lodash')
, template = require('./index.html')
, validation = require('../../../helpers/validation')

module.exports = function(after) {
    var $el = $('<div class=settings-profile>').html(template())
    , ctrl = {
        $el: $el
    }
    , $form = $el.find('form')
    , $submit = $el.find('[type="submit"]')

    // Populate country dropdown
    var countries = require('../../../assets/callingcodes.json')
    , $country = $el.field('country')
    $country.append(_.map(countries, function(country) {
        return util.format('<option value="%s">%s</option>', country.code, country.name)
    }))

    // Navigation
    var validateFirstName = validation.fromRegex($el.find('.first-name'), /^.{1,50}$/)
    , validateLastName = validation.fromRegex($el.find('.last-name'), /^.{1,50}$/)
    , validateAddress = validation.fromRegex($el.find('.address'), /^[\s\S]{1,200}$/)
    , validateCity = validation.fromRegex($el.find('.city'), /^.{1,50}$/)
    , validatePostalArea = validation.fromRegex($el.find('.postal-area'), /^.{1,50}$/)

    validation.monitorField($el.field('firstName'), validateFirstName)
    validation.monitorField($el.field('lastName'), validateLastName)
    validation.monitorField($el.field('address'), validateAddress)
    validation.monitorField($el.field('city'), validateCity)
    validation.monitorField($el.field('postalArea'), validatePostalArea)

    var validate = validation.fromFields({
        firstName: validateFirstName,
        lastName: validateLastName,
        address: validateAddress,
        city: validateCity,
        postalArea: validatePostalArea
    })

    var canEdit = !(api.user.poi || api.user.poa)
    $el.toggleClass('is-allowed-to-edit', canEdit)

    if (!canEdit) {
        $el.find('.form-control').prop('disabled', true)
    }

    $form.on('submit', function(e) {
        e.preventDefault()

        $submit.addClass('is-loading')
        $el.removeClass('has-saved')

        // Disable controls and buttons
        $el.find('.form-control, button').prop('disabled', true)

        validate(true)
        .then(function(values) {
            values.country = $el.field('country').val()

            api.call('v1/users/identity', values)
            .then(function() {
                _.extend(api.user, values)
                api.trigger("user", api.user)
                if (typeof Intercom != 'undefined' && Intercom) {
                    Intercom('update', {
                        name: values.firstName + ' ' + values.lastName,
                        address: values.address,
                        city: values.city,
                        postalArea: values.postalArea,
                        country: values.country
                    })
                }

                api.securityLevel(3)

                $app.addClass('is-user-country-' + api.user.country)

                if (after) {
                    alertify.log(i18n('settings.profile.confirmation'))
                    router.after(after)
                } else {
                    $el.addClass('has-saved')
                }
            })
            .fail(errors.alertFromXhr)
        })
        .always(function() {
            $submit.removeClass('is-loading')
            $el.find('.form-control, button').prop('disabled', false)
        })
    })

    if (api.user.country) {
        $el.field('country').val(api.user.country)
    } else {
        // Guess the user's country
        var lang = api.user.language

        if (lang) {
            var countryCodeGuess = lang.substr(lang.length - 2, 2).toUpperCase()
            $el.field('country').val(countryCodeGuess)
        }
    }

    return ctrl
}
