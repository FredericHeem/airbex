var template = require('./index.html')
, nav = require('../nav')

module.exports = function() {
    var $el = $('<div class="create-voucher is-creating">').html(template())
    , ctrl = {
        $el: $el
    }
    , $form = $el.find('.form')
    , $submit = $form.find('.submit')
    , amount = require('../../shared/amount-input')({
        currencies: 'digital',
        max: 'available'
    })

    // Insert amount control
    $el.find('.amount-placeholder').replaceWith(amount.$el)

    // Submit
    $form.on('submit', function(e) {
        e.preventDefault()

        if (!amount.validate(true)) {
            $form.field('amount').focus()
            $submit.shake()
            return
        }

        $submit.loading(true)

        $form.field('amount')
        .add($form.field('currency'))
        .enabled(false)

        api.createVoucher(amount.value(), amount.currency())
        .always(function() {
            $form.field('amount')
            .add($form.field('currency'))
            .enabled(true)
            $submit.loading(false)
        })
        .fail(errors.alertFromXhr)
        .done(function() {
            api.balances()
            router.go('account/vouchers')
        })
    })

    $el.find('.form-control:visible:not(disabled)').focusSoon()

    // Dispose
    $el.on('remove', function() {
        amount.$el.triggerHandler('remove')
    })

    // Insert navigation
    $el.find('.withdraw-nav').replaceWith(nav('voucher').$el)

    return ctrl
}
