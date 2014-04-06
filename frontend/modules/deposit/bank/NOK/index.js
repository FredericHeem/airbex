var nav = require('../../nav')
, template = require('./index.html')

module.exports = function() {
    var $el = $('<div class=deposit-bank-NOK>').html(template({
        messageToRecipient: api.user.tag
    }))
    .addClass('is-step-sender')
    , ctrl = {
        $el: $el
    }

    function step(val) {
        if (val !== undefined) {
            step.val = val
            $el.removeClasses(/^is-step-/).addClass('is-step-' + val)
        }
        return step.val
    }

    // Insert navigation
    $el.find('.deposit-nav').replaceWith(nav('bank').$el)

    $el.toggleClass('is-allowed', api.user.country == 'NO')

    step('sender')

    // Next step from Sender
    $el.on('click', '.step-sender [data-action="next-step"]', function(e) {
        e.preventDefault()
        var $btn = $(this).loading(true)
        $btn.siblings().enabled(false)
        setTimeout(function() {
            $btn.loading(false).siblings().enabled(true)
            step('payment')
        }, 1.25e3)
    })

    // Next step from Payment
    $el.on('click', '.step-payment [data-action="next-step"]', function(e) {
        e.preventDefault()
        var $btn = $(this).loading(true)
        $btn.siblings().enabled(false)
        setTimeout(function() {
            $btn.loading(false).siblings().enabled(true)
            step('summary')
        }, 1.5e3)
    })

    // Previous step from Sender
    $el.on('click', '.step-payment [data-action="prev-step"]', function(e) {
        e.preventDefault()
        step('sender')
    })

    return ctrl
}
