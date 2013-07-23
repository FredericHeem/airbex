var template = require('./index.html')
, _ = require('lodash')
, num = require('num')
, debug = require('debug')('snow:amount-input')

module.exports = function(opts) {
    opts = _.extend({
        fixedCurrency: false,
        currency: null,
        currencies: _.pluck(api.currencies.value, 'id'),
        minExclusive: 0,
        maxExclusive: null,
        minInclusive: null,
        maxInclusive: null,
        maxPrecision: null,
        value: ''
    }, opts)

    var $el = $('<div class="amount-input">').html(template(opts))
    , controller = {
        $el: $el,
        opts: opts
    }
    , $amount = $el.find('.amount')
    , $amountField = $el.field('amount')

    $el.toggleClass('is-fixed-currency')

    controller.validate = function(emptyIsError) {
        var val = $amountField.val()
        , empty = !val.length
        $amount.toggleClass('is-empty', empty)

        if (empty) {
            debug('amount is empty')
            $amount.toggleClass('error is-invalid', !!emptyIsError)
            return
        }

        var valn = $amountField.parseNumber()

        if (valn === null) {
            $amount.addClass('error is-invalid')
            return
        }

        valn = num(valn)

        debug('value parsed as %s', valn.toString())

        var currency = opts.fixedCurrency ? opts.currency : $el.field('currency').val()

        var maxPrecision = opts.maxPrecision !== null ?
            opts.maxPrecision :
            _.find(api.currencies.value, { id: currency }).scale

        if (valn.get_precision() > maxPrecision) {
            debug('precision %s is higher than max, %s', valn.get_precision(),
                maxPrecision)

            $amount.addClass('error is-invalid')
            return
        }

        if (opts.minInclusive !== null && valn.lt(opts.minInclusive)) {
            $amount.addClass('error is-invalid')
            debug('lt min inclusive %s', opts.minInclusive)
            return
        }

        if (opts.maxInclusive !== null && valn.gt(opts.maxInclusive)) {
            $amount.addClass('error is-invalid')
            debug('gt max inclusive %s', opts.maxInclusive)
            return
        }

        if (opts.minExclusive !== null && valn.lte(opts.minExclusive)) {
            $amount.addClass('error is-invalid')
            debug('lte min exclusive %s', opts.minExclusive)
            return
        }

        if (opts.maxExclusive !== null && valn.gte(opts.maxExclusive)) {
            $amount.addClass('error is-invalid')
            debug('gte max exclusive %s', opts.maxExclusive)
            return
        }

        var balanceItem = _.find(api.balances.current, { currency: currency})
        , avail = balanceItem.available

        if (valn.gt(avail)) {
            $amount.addClass('error is-invalid')
            debug('gt available %s', avail)
            return
        }

        $amount.removeClass('error is-invalid')

        return true
    }

    $amountField.on('keyup change', function(e) {
        if (e.which == 13) return
        controller.validate()
    })

    $el.on('click', '[data-action="all"]', function(e) {
        e.preventDefault()
        var currency = opts.fixedCurrency ? opts.currency : $el.field('currency').val()
        , balanceItem = _.find(api.balances.current, { currency: currency})
        , avail = balanceItem.available
        $amountField.val(numbers.format(avail))
        controller.validate()
    })

    if (!opts.fixedCurrency) {
        $el.field('currency').html($.map(opts.currencies, function(id) {
            return $('<option value="' + id + '">' + id + '</option>')
        }))
    }

    controller.validate()

    return controller
}
