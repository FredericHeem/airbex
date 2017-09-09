var util = require('util')
, _ = require('lodash')
, template = require('./index.html')

module.exports = function(after) {
    var $el = $('<div class=auth-identity>').html(template())
    , controller = {
        $el: $el
    }
    , $form = $el.find('form')

    var countries = require('../../../assets/callingcodes.json')
    , $country = $el.field('country')
    $country.append(_.map(countries, function(country) {
        return util.format('<option value="%s">%s</option>', country.code, country.name)
    }))

    $form.field('first-name').focusSoon()

    $form.on('submit', function(e) {
        e.preventDefault()
        var $btn = $form.find('[type="submit"]')

        var address1 = $el.field('address1').val()
        , address2 = $el.field('address2').val()
        , address = address2 ? address1 + '\n' + address2 : address1
        , data = {
            firstName: $el.field('firstName').val(),
            lastName: $el.field('lastName').val(),
            address: address,
            city: $el.field('city').val(),
            postalArea: $el.field('postalArea').val(),
            country: $el.field('country').val()
        }

        $form.find('.first-name').toggleClass('has-error', !data.firstName)
        $form.find('.last-name').toggleClass('has-error', !data.lastName)
        $form.find('.address1').toggleClass('has-error', !data.address)
        $form.find('.city').toggleClass('has-error', !data.city)
        $form.find('.postal-area').toggleClass('has-error', !data.postalArea)
        $form.find('.country').toggleClass('has-error', !data.country)

        if ($form.find('.has-error').length) {
            return
        }

        $btn.loading(true)

        api.call('v1/users/identity', data)
        .then(function() {
            _.extend(api.user, data)

            if (typeof Intercom != 'undefined' && Intercom) {
                Intercom('update', {
                    name: data.firstName + ' ' + data.lastName,
                    address: data.address,
                    city: data.city,
                    postalArea: data.postalArea,
                    country: data.country
                })
            }

            api.user.securityLevel = 3

            $app.addClass('is-user-country-' + api.user.country)

            router.after(after)
        })

        .fail(function(err) {
            if (err.name == 'IdentityAlreadySet') {
                return router.after(after)
            }

            errors.alertFromXhr(err)
        })
        .finally(function() {
            $btn.loading(false)
        })
    })

    var lang = api.user.language

    if (lang) {
        var countryCodeGuess = lang.substr(lang.length - 2, 2).toUpperCase()
        $country.val(countryCodeGuess)
    }

    return controller
}