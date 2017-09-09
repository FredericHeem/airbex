var format = require('util').format
, _ = require('lodash')
, template = require('./index.html')
, sepa = require('../../../assets/sepa.json')
, wire = require('../../../assets/wire.json')

module.exports = function(currency) {
    var $el = $('<div class=withdraw-bank>').html(template())
    , ctrl = {
        $el: $el
    }
    , $form = ctrl.$el.find('form')
    , $account = $form.field('account')
    , amount = require('../../shared/amount-input')({
        currency: currency || (currency = api.defaultFiatCurrency()),
        currencies: 'fiat',
        max: 'available',
        maxPrecision: 2
    })

    //var allowed = ~sepa.indexOf(api.user.country) || ~wire.indexOf(api.user.country)
    var allowed = true;
    // Insert amount control
    $el.find('.amount-placeholder').append(amount.$el)

    $el.on('remove', function() {
        amount.$el.triggerHandler('remove')
    })

    // Enumerate bank accounts
    api.bankAccounts()
    .then(function(accounts) {
        $el.toggleClass('is-empty', !accounts.length)

        $account.html(_.map(accounts, function(a) {
            return format(
                '<option class="bank-account" value="%s">%s</option>',
                a.id, _.escape(formatters.bankAccount(a)))
        }))
    })
    .fail(errors.alertFromXhr)

    $form.on('submit', function(e) {
        e.preventDefault()

        if (!amount.validate(true)) return

        api.call('v1/withdraws/bank', {
            amount: amount.value(),
            bankAccount: +$account.val(),
            currency: amount.currency()
        })
        .then(function() {
            api.fetchBalances()
            router.go('#withdraw/withdraws')
        })
        .fail(errors.alertFromXhr)

    })

    $el.toggleClass('is-allowed', !!allowed)

    return ctrl
}
