var template = require('./index.html')
, validation = require('../../../../helpers/validation')
, iban = require('../../../../assets/iban.json')
, ibanChecker = require('../../../../vendor/iban.js')

module.exports = function() {
    var $el = $('<div class=account-bankaccounts-add>')
    .html(template())
    , ctrl = {
        $el: $el
    }
    , $modal = $el.find('.modal')
    , $form = $el.find('form')
    , $submit = $form.find('[type="submit"]')

    $el.on('remove', function() {
        $modal.modal('hide')
    })

    $el.on('click', '[data-action="close"]', function(e) {
        e.preventDefault()
        history.go(-1)
    })

    $el.on('click', '[data-action="advanced"]', function(e) {
        e.preventDefault()
        $form.addClass('is-advanced')
    })

    $el.find('.modal').modal({
        keyboard: false,
        backdrop: 'static'
    })
    
    var validateIban = validation.fromFn($el.find('.iban'), function(d, iban) {
        if (!ibanChecker.isValid(iban))  {
            console.log("invalid iban: %s", iban)
            return d.reject('is-iban-invalid')
        }
        console.log("valid iban: %s", iban)
        return d.resolve(ibanChecker.electronicFormat(iban))
    })
    validation.monitorField($el.field('iban'), validateIban)

    var validateAccountNumber = validation.fromRegex($el.find('.account-number'), /^[0-9]{1,35}$/)
    validation.monitorField($el.field('accountNumber'), validateAccountNumber)

    var validateRoutingNumber = validation.fromRegex($el.find('.routing-number'), /^[A-Za-z0-9 ]{0,35}$/)
    validation.monitorField($el.field('routingNumber'), validateRoutingNumber)

    var validateSwift = validation.fromRegex($el.find('.swift'), /^[A-Za-z0-9 ]{1,15}$/)
    validation.monitorField($el.field('swift'), validateSwift)

    var validateName = validation.fromRegex($el.find('.name'), /^.{0,25}$/)
    validation.monitorField($el.field('name'), validateName)

    var validate = validation.fromFields({
        iban: validateIban,
        swift: validateSwift,
        name: validateName,
        routingNumber: validateRoutingNumber,
        accountNumber: validateAccountNumber
    })

    $form.on('submit', function(e) {
        e.preventDefault()

        validate(true)
        .fail(function() {
            $form.find('.has-error:first').field().focus()
            $submit.shake()
        })
        .done(function(values) {
            $submit.loading(true)

            return api.call('v1/bankAccounts', {
                iban: values.iban,
                swiftbic: values.swift,
                displayName: values.name,
                accountNumber: values.accountNumber,
                routingNumber: values.routingNumber === '' ? null : values.routingNumber
            })
            .then(function() {
                history.go(-1)
            })
            .fail(errors.alertFromXhr)
            .finally(function() {
                $submit.loading(false)
            })
        })
    })

    var typeGuess = 'international'

    if (api.user.country == 'NO') {
        typeGuess = 'norway'
    } else if (~iban.indexOf(api.user.country)) {
        typeGuess = 'iban'
    }

    if (api.user.country != 'NO') {
        $form.find('select[name="type"] option[value="norway"]').remove();
    }

    $form.field('type').on('change', function() {
        $form
        .removeClass('is-type-norway is-type-iban is-type-international')
        .addClass('is-type-' + $(this).val())
    })
    .val(typeGuess)
    .trigger('change')

    return ctrl
}
