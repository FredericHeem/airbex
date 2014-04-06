var template = require('./index.html')
, format = require('util').format
, nav = require('../nav')

module.exports = function() {
    var $el = $('<div class="withdraw-email">').html(template())
    , controller = {
        $el: $el
    }
    , $transferForm = $el.find('.transfer-form')
    , $email = $transferForm.find('.email')
    , $transferButton = $transferForm.find('.submit')
    , $sendForm = $el.find('.send-form')
    , $sendButton = $sendForm.find('.submit')
    , amount = require('../../shared/amount-input')({
        currencies: 'digital',
        max: 'available'
    })

    $el.find('.amount-placeholder').replaceWith(amount.$el)

    function validateEmail() {
        var val = $transferForm.field('email').val()
        return $email
        .toggleClass('has-error', !/^\S+@\S+$/.exec(val))
        .hasClass('error')
    }

    $transferForm.on('change', '.field', function() {
        $(this).closest('.form-group').removeClass('is-error')
    })

    $transferForm.on('submit', function(e) {
        e.preventDefault()

        $transferForm.find('.field').blur()

        validateEmail()
        amount.validate(true)

        if ($transferForm.find('.has-error').length) {
            $transferForm.find('.has-error:first').find('.field:first').focus()
            $transferButton.shake()
            return
        }

        $transferForm.find('.field').enabled(false)
        $transferButton.loading(true, 'Sending...')

        api.sendToUser($transferForm.field('email').val(), amount.value(), amount.currency())
        .always(function() {
            $transferButton.loading(false)
        })
        .fail(function(err) {
            $transferButton.enabled(true)

            $transferForm.find('.field').enabled(true)

            if (err.name == 'CannotTransferToSelf') {
                $email.addClass('has-error')
                .find('.help-block')
                .html('Cannot send to self')
                $email.find('.field').focus()
                return
            }

            if (err.name == 'UserNotFound') {
                $sendForm.show()
                .find('.email')
                .html($transferForm.field('email').val())

                $transferButton.enabled(false)
                return
            }

            errors.alertFromXhr(err)
        })
        .done(function() {
            showConfirmation(format('You sent %s to %s',
                numbers(amount.value(), { currency: amount.currency() }),
                $transferForm.field('email').val()))
        })
    })

    function showConfirmation(msg) {
        var $sendConfirmed = $el.find('.send-confirmed').show()
        , $confirmation = $sendConfirmed.find('.confirmation')

        $confirmation.html(msg)
    }

    $sendForm.on('submit', function(e) {
        e.preventDefault()

        $sendButton.loading(true)

        api.sendToUser($transferForm.field('email').val(), amount.value(), amount.currency(), true)
        .always(function() {
            $sendButton.loading(false)
        })
        .fail(function(err) {
            errors.alertFromXhr(err)
        })
        .done(function() {
            $sendButton.enabled(false)
            showConfirmation(format('You sent %s to %s',
                numbers(amount.value(), { currency: amount.currency() }),
                $transferForm.field('email').val()))
        })
    })

    $el.on('click', 'a[href="#withdraw/email"]', function() {
        router.reload()
    })

    $transferForm.field('amount').focusSoon()

    // Dispose
    $el.on('remove', function() {
        amount.$el.triggerHandler('remove')
    })

    // Insert navigation
    $el.find('.withdraw-nav').replaceWith(nav('email').$el)

    return controller
}
