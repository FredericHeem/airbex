var template = require('./index.html')
, nav = require('../nav')
, format = require('util').format

module.exports = function() {
    var $el = $('<div class=deposit-ripple>').html(template())
    , ctrl = {
        $el: $el
    }

    // Amount control
    var amount = require('../../shared/amount-input')({
        currencies: 'digital',
        currency: 'XRP',
        min: '0.000001',
        max: 'available'
    })

    $el.find('.amount-placeholder').replaceWith(amount.$el)

    // Insert left navigation
    $el.find('.deposit-nav').replaceWith(nav('ripple').$el)

    // Our Ripple account
    api.rippleAddress()
    .done(function(address) {
        $el.field('address').val(address)
    })

    // Update the "Continue to Ripple" link whenever the amount/currency changes
    $el.on('change keyup', '.form-control', function() {
        $el.find('.submit')
        .attr('href', format('https://ripple.com//send?to=%s&dt=%s&amount=%s/%s',
            api.rippleAddress.value,
            api.user.tag,
            amount.value(),
            amount.currency()
        ))
    })

    $el.on('click', '.submit', function() {
        setTimeout(function() {
            router.go('account/transactions')
        }, 1500)
    })

    // Destructor
    $el.on('remove', function() {
        amount.$el.triggerHandler('remove')
    })

    return ctrl
}
