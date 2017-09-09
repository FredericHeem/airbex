var template = require('./index.html')
, _ = require('lodash')
, num = require('num')
module.exports = function(currency) {
	var currencyOption = numbers.getCurrencyOption(currency);
    var $el = $('<div class="withdraw-crypto is-entry">').html(template({
		currency:currency,
		name: currencyOption.name
	}))
    , controller = {
        $el: $el
    }
    var currencyOption = numbers.getCurrencyOption(currency);
    var withdraw_min = currencyOption.withdraw_min;
    var withdraw_fee = numbers.formatAmount(currencyOption.withdraw_fee, currency);
    var addressRegEx = new RegExp(currencyOption.address_regex);
    
    var amount = require('../../shared/amount-input')({
        currencies: [currency],
        min: withdraw_min,
        max: 'available'
    })
    , $address = $el.find('.entry .address')
    , $button = $el.find('.entry .submit')
    , $status = $el.find('.summary .status')
    , timer

    $el.find('.amount-placeholder').replaceWith(amount.$el)

    function validateAddress(emptyIsError) {
        var val = $el.field('address').val()
        , empty = !val.length

        if (empty) {
            $address.toggleClass('has-error is-invalid', emptyIsError === true)
            return
        }
        
        if (!val.match(addressRegEx)){
            $address.addClass('has-error is-invalid')
            return
        }

        $address.removeClass('has-error is-invalid')
        return true
    }

    function updateRequestStatus(requestId, delay) {
        $status.addClass('is-updating')

        api.call('v1/withdraws')
        .then(function(res) {
            var wr = _.find(res, { id: requestId })
            if (!wr) return

            $status.removeClasses(/^is-/)
            .addClass('is-' + wr.state)

            if (wr.state == 'requested' || wr.state == 'processing' ||  wr.state == 'sendingEmail') {
                timer = setTimeout(function() {
                    updateRequestStatus(requestId, delay * 2)
                }, delay)
            }

            if (wr.state == 'cancelled') {
                $status.find('.cancelled-reason').html(wr.error)
            }

            if (wr.state == 'cancelled' || wr.state == 'completed') {
                api.fetchBalances()
            }
        })
        .fail(function() {
            timer = setTimeout(function() {
                updateRequestStatus(requestId, delay * 2)
            }, delay)
        })
    }

    function showSummary(requestId) {
        $el.toggleClass('is-review is-summary')

        $status.addClass('is-requested')

        updateRequestStatus(requestId, 2e3)
    }

    $el.field('address').on('keyup', validateAddress)

    $el.on('submit', '.entry', function(e) {
        e.preventDefault()

        validateAddress(true)
        amount.validate(true)

        var $error = $el.find('.has-error')

        if ($error.length) {
            $button.shake()
            $error.filter(':first').find('.form-control:visible:first').focus()
            return
        }

        $el.toggleClass('is-entry is-review')

        $el.find('.review .amount, .summary .amount')
        .html($el.field('amount').val())

        $el.find('.review .address, .summary .address')
        .html($el.field('address').val())
        
        $el.find('.review .fee, .summary .fee')
        .html(withdraw_fee)
    })

    $el.on('click', '.review .confirm', function(e) {
        e.preventDefault()

        $el.find('.review .submit').loading(true, 'Confirming...')
        api.call('v1/' + currency.toLowerCase() + '/out', {
            amount: amount.value(),
            address: $el.field('address').val()
        })
        .then(function(res) {
            showSummary(res.id)
            api.fetchBalances()
        })
        .fail(errors.alertFromXhr)

    })

    $el.on('remove', function() {
        timer && clearTimeout(timer)
        amount.$el.triggerHandler('remove')
    })
    
    return controller
}
