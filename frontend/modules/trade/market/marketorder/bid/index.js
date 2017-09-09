/* global -confirm */
var num = require('num')
, template = require('./index.html')
, debug = require('../../../../../helpers/debug')('trade')
, estimate = require('./estimate')
, balanceLabel = require('../../../../shared/balance')
, confirm = require('../../../../shared/modals/confirm')
, validation = require('../../../../../helpers/validation')

module.exports = exports = function(market) {
    var base = api.getBaseCurrency(market)
    , quote = api.getQuoteCurrency(market)
    , $el = $('<div class="bid">').html(template({
        base: base,
        quote: quote
    }))
    , ctrl = {
        $el: $el
    }
    , $form = $el.find('form')
    , $amount = $el.find('.amount')
    , $submit = $form.find('[type="submit"]')
    , depth
    , feeRatio = api.marketsInfo[market].fee_bid_taker
    , quotePrec = api.currencies[quote].scale
    , basePrec = api.currencies[base].scale
    , bidmintotal = api.marketsInfo[market].bidmintotal
    , baseScaleDisplay = api.currencies[base].scale_display;
    
    var validateAmount = validation.fromFn($el.find('.amount'), function(d, val) {
        val = numbers.parse(val)
        if (!val || val <= 0) return d.reject('is-invalid')

        var summary = estimate.summary(market, val, feeRatio)
        if (!summary) {
            return d.reject('is-too-deep')
        }
        
        if(num.lt(numbers.getCurrencyNum(summary.amountWithoutFee, quote), numbers.getCurrencyNum(bidmintotal, quote))){
            return d.reject('is-too-small')
        }
        
        if (num(val).get_precision() > quotePrec) {
            return d.reject('is-precision-too-high')
        }

        var avail = api.balances[quote].available

        if (num(val).gt(avail)) return d.reject('has-insufficient-funds')

        if (!estimate.summary(market, val, feeRatio)) {
            return d.reject('is-too-deep')
        }

        return d.resolve(val)
    })

    validation.monitorField($el.field('amount'), validateAmount)

    var validate = validation.fromFields({
        amount: validateAmount
    })

    // Re-summarize on any input change
    $form.on('keyup change', '.form-control', summarize)

    $form.on('submit', function(e) {
        e.preventDefault()

        validate(true)
        .then(function(values) {
            $form.addClass('is-loading')

            return confirm(
                i18n('markets.market.marketorder.bid.confirm',
                    base,
                    numbers.formatCurrency(values.amount, quote)))
            .then(function() {
                return values
            })
        })
        .always(function() {
            $form.removeClass('is-loading')
        })
        .done(function(values) {
            $submit.loading(true, i18n('markets.market.marketorder.bid.placing order'))
            var summary = estimate.summary(market, values.amount, feeRatio)

            debug("amount: %s, amount without fees: %s", values.amount, summary.amountWithoutFee)
            api.call('v1/spend', {
                market: market,
                amount: summary.amountWithoutFee
            })
            .then(function() {
                api.depth(market)
                api.fetchBalances()

                //alertify.log(i18n('trade.market.order placed'))
                $amount.field().focus().val('')
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

        if (amount && amount > 0) {
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

        if (num(feeRatio).lte(0)) {
            $summary.find('.fee')
            .css('color', 'green')
        } 
        $summary.find('.fee')
        .html(numbers.formatCurrency(summary.fee, quote))
        .attr('title', numbers.formatAmount(summary.fee, quote))
        
        var receive = numbers.format(summary.receive, 
                { precision: baseScaleDisplay},
                base);
        
        $summary.find('.receive-quote')
        .html(receive)
        .attr('title', receive)
    }

    $el.on('click', '[data-action="spend-all"]', function(e) {
        e.preventDefault()
        $form.field('amount')
        .val(numbers.format(api.balances[quote].available, {
            thousands: false
        }))
        .trigger('change')
    })

    function onBalance() {
        validate()
    }

    function onDepth(x) {
        depth = x
        debug('re-validating on depth update...')
        validate()
    }

    api.on('balances:' + quote, onBalance)
    api.on('depth:' + market, onDepth)

    $amount.field().on('keyup change', validate)

    $el.find('.available').replaceWith(balanceLabel({
        currency: quote,
        flash: true
    }).$el)

    $el.on('remove', function() {
        api.off('balances:' + quote, onBalance)
        api.off('depth:' + market, onDepth)
    })

    return ctrl
}
