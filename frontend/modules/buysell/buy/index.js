var template = require('./index.html')

module.exports = function() {
	var $el = $('<div class="buy-crypto is-entry">').html(template())
	, controller = {
		$el: $el
	}
    
	var amount = require('../../shared/amount-input')({
		currencies: ["CHF","EUR"],
		min: '20',
		max: '100000',
		showAvailable: false,
		tooHighError: "Contact us for such amount"
	})
	
    amount.value('5000');
	
	$el.find('.amount-placeholder').replaceWith(amount.$el)

	, $address = $el.find('.entry .address')
	, $button = $el.find('.entry .submit')
	, $status = $el.find('.summary .status')

    function validateAddress(currency, emptyIsError) {
        var val = $el.field('address').val()
        , empty = !val.length

    	
        var currencyOption = numbers.getCurrencyOption(currency);
        var addressRegEx = new RegExp(currencyOption.address_regex);
        	
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
	
	$el.on('submit', '.entry', function(e) {
		e.preventDefault()

		var base_currency = "BTC";
		validateAddress(base_currency, false)
		amount.validate(true)

		var $error = $el.find('.has-error')

		if ($error.length) {
			$button.shake()
			$error.filter(':first').find('.form-control:visible:first').focus()
			return
		}

		$el.find('.entry').addClass('hide')
		$el.find('.review').removeClass('hide')
		$el.find('.review .amount, .summary .amount')
		.html($el.field('amount').val())
		$el.find('.review .quote_currency, .summary .quote_currency')
		.html(amount.currency())
		$el.find('.review .address, .summary .address')
		.html($el.field('address').val())
	})

	function showSummary(requestId) {
		$el.find('.review').addClass('hide')
        $el.find('.summary').removeClass('hide')
    }
	
	$el.on('click', '.review .confirm', function(e) {
		e.preventDefault()
		var base_currency = 'BTC';
		var quote_currency = amount.currency();
		var market = base_currency + quote_currency;
		var address = $el.field('address').val()
	
		$el.find('.review .submit').loading(true, 'Confirming...')
		api.call('v1/purchaseOrder', {
			type:'bid',
			market:market,
			amount: amount.value(),
			address: address.lenghth > 0 ? address: undefined
		}, { type: 'POST' })
		.fail(errors.alertFromXhr)
		.done(function(res) {
			showSummary(res.id)
		})
	})
	
	return controller
}