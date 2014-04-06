/* global -confirm */
var num = require('num')
, template = require('./index.html')
, estimate = require('./estimate')
, balanceLabel = require('../../../../shared/balance')
, validation = require('../../../../../helpers/validation')
, confirm = require('../../../../shared/modals/confirm')

module.exports = function(market) {
    var base = market.substr(0, 3)
    , quote = market.substr(3, 3)
    , feeRatio = api.feeRatio(market)
    , basePrec = api.currencies[base].scale
    , amountPrec = api.currencies[base].scale - api.markets[market].scale
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
    , minAsk = 0.001;
    
    // Validation
    var validateAmount = validation.fromFn($el.find('.amount'), function(d, val) {
        val = numbers.parse(val)

        if (!val || val <= 0) return d.reject('is-invalid')

        if(val < minAsk){
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
                numbers(values.amount, { currency: base }), quote)

            return confirm(confirmText)
            .then(function() {
                return values
            })
        })
        .done(function(values) {
            $submit.loading(true, i18n('markets.market.marketorder.ask.placing order'))

            api.call('v1/orders', {
                market: market,
                type: 'ask',
                amount: num(values.amount).mul('1.00000').div(num('1').add(feeRatio)).toString(),
                price: null
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

        $summary.find('.receive-price')
        .html(numbers.format(summary.price, { precision: quotePrec, currency: quote }))
        .attr('title', numbers.format(summary.price, {
            precision: api.markets[market].scale,
            currency: quote
        }))

        if (feeRatio === 0) {
            $summary.find('.fee')
            .css('color', 'green')
            .css('font-weight', 'bold')
            .html('FREE')
        } else {
            $summary.find('.fee')
            .html(numbers.format(summary.fee, { precision: basePrec, currency: base }))
            .attr('title', numbers.format(summary.fee, {
                precision: api.currencies[base].scale,
                currency: base
            }))
        }

        $summary.find('.receive-quote')
        .html(numbers.format(summary.receive, { precision: quotePrec, currency: quote }))
        .attr('title', numbers.format(summary.receive, {
            precision: api.currencies[quote].scale,
            currency: quote
        }))
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
