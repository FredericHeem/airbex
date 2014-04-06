/* global -confirm */
var num = require('num')
, template = require('./index.html')
, debug = require('../../../../../helpers/debug')('trade')
, estimate = require('./estimate')
, balanceLabel = require('../../../../shared/balance')
, confirm = require('../../../../shared/modals/confirm')
, validation = require('../../../../../helpers/validation')

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
    , $submit = $form.find('[type="submit"]')
    , depth
    , feeRatio = api.feeRatio(market)
    , quotePrec = api.currencies[quote].scale
    , basePrec = api.currencies[base].scale
    , minAsk = 0.1; // In base currency 
    
    var validateAmount = validation.fromFn($el.find('.amount'), function(d, val) {
        val = numbers.parse(val)
        if (!val || val <= 0) return d.reject('is-invalid')

        if(val < minAsk){
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
                    numbers(values.amount, { currency: quote, precision: quotePrec, })))
            .then(function() {
                return values
            })
        })
        .always(function() {
            $form.removeClass('is-loading')
        })
        .done(function(values) {
            $submit.loading(true, i18n('markets.market.marketorder.bid.placing order'))

            api.call('v1/spend', {
                market: market,
                amount: num(values.amount).mul('1.000000').div(num('1').add(feeRatio)).toString()
            })
            .always(function() {
                $submit.loading(false)
            })
            .fail(errors.alertFromXhr)
            .done(function() {
                api.depth(market)
                api.balances()

                alertify.log(i18n('trade.market.order placed'))
                $amount.field().focus().val('')
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

        $summary.find('.receive-price')
        .html(numbers.format(summary.price, { precision: quotePrec, currency: quote }))
        .attr('title', numbers.format(summary.price, { precision: quotePrec, currency: quote }))

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

        $summary.find('.receive-quote')
        .html(numbers(summary.receive, { precision: basePrec, currency: base }))
        .attr('title', numbers(summary.receive, {
            precision: basePrec,
            currency: base
        }))
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
