/* global -confirm */
var num = require('num')
, template = require('./index.html')
, estimate = require('./estimate')
, balanceLabel = require('../../../../shared/balance')
, validation = require('../../../../../helpers/validation')
, confirm = require('../../../../shared/modals/confirm')
, debug = require('../../../../../helpers/debug')('trade:askmarketorder')

module.exports = function(market) {	
    var base = api.getBaseCurrency(market)
    , quote = api.getQuoteCurrency(market)
    , feeRatio = api.marketsInfo[market].fee_ask_taker
    , basePrec = api.currencies[base].scale
    , quotePrec = api.currencies[quote].scale
    , quoteDisplay = api.currencies[quote].scale_display
    , $el = $('<div class="ask">').html(template({
        base: base,
        quote: quote
    }))
    , $form = $el.find('form')
    , $submit = $form.find('[type="submit"]')
    , $amount = $el.find('.amount')
    , ctrl = {
        $el: $el
    }
    , askminvolume = api.marketsInfo[market].askminvolume
    
    // Validation
    var validateAmount = validation.fromFn($el.find('.amount'), function(d, val) {
        val = numbers.parse(val)

        if (!val || val <= 0) return d.reject('is-invalid')

        if(num.lt(numbers.getCurrencyNum(val, base), numbers.getCurrencyNum(askminvolume, base))){
            return d.reject('is-too-small')
        }
        
        if (num(val).get_precision() > basePrec) {
            return d.reject('is-precision-too-high')
        }
        
        var avail = api.balances[base].available

        if (num(val).gt(avail)) return d.reject('has-insufficient-funds')

        if (!estimate.receive(market, val)) return d.reject('is-too-deep')

        return d.resolve(val)
    })

    validation.monitorField($el.field('amount'), validateAmount)

    var validate = validation.fromFields({
        amount: validateAmount
    })

    // Update summary whenever a field is changed
    $form.on('keyup change', '.form-control', summarize)

    // Available label
    $el.find('.available').replaceWith(balanceLabel({
        currency: base,
        flash: true
    }).$el)

    $form.on('submit', function(e) {
        e.preventDefault()

        $form.addClass('is-loading')

        validate(true)
        .always(function() {
            $form.removeClass('is-loading')
            $amount.field().focus()
        })
        .then(function(values) {
            var confirmText = i18n(
                'markets.market.marketorder.ask.confirm',
                numbers.formatCurrency(values.amount, base),
                quote)

            return confirm(confirmText)
            .then(function() {
                return values
            })
        })
        .done(function(values) {
            $submit.loading(true, i18n('markets.market.marketorder.ask.placing order'))
            var orderAmount = values.amount;
            debug("orderAmount net: ", orderAmount);
            api.call('v1/orders', {
                market: market,
                type: 'ask',
                amount: orderAmount,
                price: null
            })
            .then(function() {
                api.depth(market)
                api.fetchBalances()

                //alertify.log(i18n('trade.market.order placed'))

                $amount.field().val('')
            })
            .fail(errors.alertFromXhr)
            .finally(function() {
                $submit.loading(false)
            })
        })
    })

    function summarize() {
        var $summary = $el.find('.order-summary')
        , amount = numbers.parse($amount.field().val())
        , summary

        if (amount) {
            summary = estimate.summary(market, amount, feeRatio)
        }

        if (!summary) {
            $summary.find('.receive-price').empty()
            $summary.find('.fee').empty()
            $summary.find('.receive-quote').empty('')
            return
        }

        var price = numbers.format(summary.price, 
                { precision: api.markets[market].quote_scale_diplay},
                quote);
        
        $summary.find('.receive-price')
        .html(price)
        .attr('title', price)

        if (feeRatio === 0) {
            $summary.find('.fee')
            .css('color', 'green')
            .css('font-weight', 'bold')
            .html('FREE')
        } else {
            $summary.find('.fee')
            .html(numbers.formatCurrency(summary.fee, quote))
            .attr('title', numbers.formatAmount(summary.fee, quote))
        }

        $summary.find('.receive-quote')
        .html(numbers.formatCurrency(summary.receive, quote))
        .attr('title',  numbers.formatAmount(summary.receive, quote))
    }

    $el.on('click', '[data-action="sell-all"]', function(e) {
        e.preventDefault()
        $el.field('amount')
        .val(numbers(num(api.balances[base].available), {
            thousands: false,
            maxPrecision: basePrec,
            trim: true
        }))
        .trigger('change')
    })

    $amount.field().on('keyup change', validate)

    $el.find('.available').replaceWith(balanceLabel({
        currency: quote,
        flash: true
    }).$el)

    api.on('depth:' + market, summarize)

    $el.on('remove', function() {
        api.off('depth:' + market, summarize)
    })

    $amount.field().focusSoon()

    return ctrl
}
