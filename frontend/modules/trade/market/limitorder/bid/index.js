/* global -confirm */
var num = require('num')
, template = require('./index.html')
, balanceLabel = require('../../../../shared/balance')
, validation = require('../../../../../helpers/validation')
, confirm = require('../../../../shared/modals/confirm')

module.exports = exports = function(market) {
    var base = market.substr(0, 3)
    , quote = market.substr(3, 3)
    , $el = $('<div class="bid">').html(template({
        base: base,
        quote: quote
    }))
    , ctrl = {
        $el: $el
    }
    , $form = $el.find('form')
    , $amount = $el.find('.amount')
    , $price = $el.find('.price')
    , $submit = $form.find('[type="submit"]')
    , feeRatio = api.feeRatio(market)
    , quotePrec = api.currencies[quote].scale
    , basePrec = api.currencies[base].scale
    , minAsk = 0.001; // In base currency 
    
    $form.on('submit', function(e) {
        e.preventDefault()

        $form.addClass('is-loading')

        validate(true)
        .then(function(values) {
            // Show "Do you really want to buy?" dialog
            return confirm(i18n(
                'markets.market.limitorder.bid.confirm',
                numbers(values.amount, { currency: base }), numbers(values.price, { currency: quote })))
            .then(function() {
                return values
            })
        })
        .always(function() {
            $form.removeClass('is-loading')
            $amount.field().focus()
        })
        .done(function(values) {
            $submit.loading(true, i18n('markets.market.marketorder.bid.placing order'))

            return api.call('v1/orders', {
                market: market,
                type: 'bid',
                amount: values.amount,
                price: values.price
            })
            .always(function() {
                $submit.loading(false)
            })
            .fail(errors.alertFromXhr)
            .done(function() {
                api.depth(market)
                api.balances()

                alertify.log(i18n('trade.market.order placed'))
                $amount.field().val('')
            })
        })
    })

    function getSummary() {
        var amount = numbers.parse($amount.field().val())
        , price = numbers.parse($price.field().val())
        if (!amount || !price) return null
        if (+amount < 0 || +price < 0) return null
        return {
            subtotal: num(amount).mul(num(price)).toString(),
            fee: num(amount).mul(num(price)).mul(num(feeRatio)).toString(),
            total: num(amount).mul(price).mul(num(feeRatio).add(1)).toString()
        }
    }

    function summarize() {
        var $summary = $el.find('.order-summary')
        , summary = getSummary()

        if (!summary) {
            $summary.find('.subtotal').empty()
            $summary.find('.fee').empty()
            $summary.find('.total').empty('')
            return
        }

        $summary.find('.subtotal')
        .html(numbers.format(summary.subtotal, { precision: quotePrec, currency: quote }))
        .attr('title', numbers.format(summary.subtotal, {
            precision: quotePrec,
            currency: quote
        }))

        if (feeRatio === 0) {
            $summary.find('.fee')
            .css('color', 'green')
            .css('font-weight', 'bold')
            .html('FREE')
        } else {
            $summary.find('.fee')
            .html(numbers.format(summary.fee, { precision: quotePrec, currency: quote }))
            .attr('title', numbers.format(summary.fee, {
                precision: quotePrec,
                currency: quote
            }))
        }

        var totalTooHigh = num(summary.total).gt(api.balances[quote].available)

        $summary.find('.total')
        .toggleClass('is-more-than-available', totalTooHigh)
        .html(numbers.format(summary.total, { precision: quotePrec, currency: quote }))
        .attr('title', numbers.format(summary.total, {
            precision: quotePrec,
            currency: quote
        }))
    }

    $el.on('click', '[data-action="spend-all"]', function(e) {
        e.preventDefault()
        $form.field('amount')
        .val(numbers.format(api.balances[quote].available))
        .trigger('change')
    })

    // Suggest a price from the top of the order book
    // if the user has not changed the price nor entered an amount
    function onMarketDepth(depth) {
        if (!$price.field().hasClass('has-changed') &&
            !$amount.field().val().length &&
            !$price.field().val().length)
        {
            if (depth.asks.length) {
                $price.field().val(numbers.format(depth.asks[0][0]), { thousands: false })
            } else {
                $price.field().val('')
            }
        }
    }

    $price.on('keyup change', function() {
        $price.field().addClass('has-changed')
    })

    api.on('depth:' + market, onMarketDepth)

    var validateAmount = validation.fromFn($el.find('.amount'), function(d, val) {
        val = numbers.parse(val)
        if (!val || val < 0) return d.reject('is-invalid')

        if(val < minAsk){
            return d.reject('is-too-small')
        }
        
        if (num(val).get_precision() > basePrec) {
            return d.reject('is-precision-too-high')
        }

        return d.resolve(val)
    })

    var validatePrice = validation.fromFn($el.find('.price'), function(d, val) {
        val = numbers.parse(val)
        if (!val || val < 0) return d.reject('is-invalid')

        if (num(val).get_precision() > quotePrec) {
            return d.reject('is-precision-too-high')
        }

        return d.resolve(val)
    })

    validation.monitorField($el.field('amount'), validateAmount)
    validation.monitorField($el.field('price'), validatePrice)

    var validate = validation.fromFields({
        amount: validateAmount,
        price: validatePrice,
        total: function() {
            var d = $.Deferred()
            , summary = getSummary()
            if (!summary) return d.reject()
            if (+summary.total <= 0) return d.reject()
            if (+summary.total > api.balances[quote].available) return d.reject()
            return d.resolve(summary.total)
        }
    })

    // Re-summarize on any input change
    $form.on('keyup change', '.form-control', summarize)

    $el.find('.available').replaceWith(balanceLabel({
        currency: quote,
        flash: true
    }).$el)

    $el.on('remove', function() {
        api.off('depth:' + market, onMarketDepth)
        $el = null
    })

    return ctrl
}
