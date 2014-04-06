var template = require('./index.html')
, _ = require('lodash')
, num = require('num')
, debug = require('debug')('snow:amount-input')
, format = require('util').format

module.exports = function(opts) {
    opts || (opts = {})

    if (opts.currencies == 'digital') {
        opts.currencies = _.pluck(_.filter(api.currencies.value, function(x) {
            return !x.fiat
        }), 'id')
    }

    if (opts.currencies == 'fiat') {
        debug('fiat')

        opts.currencies = _.pluck(_.filter(api.currencies.value, function(x) {
            return x.fiat
        }), 'id')
    }

    if (opts.max == 'available') {
        opts.max = function(x) {
            return api.balances[x].available
        }
    }

    _.defaults(opts, {
        currency: null,
        currencies: _.pluck(api.currencies.value, 'id'),
        minE: 0,
        tooHighError: i18n('shared.amount-input.amount.too high'),
        tooSmallError: i18n('shared.amount-input.amount.too small'),
        showAvailable: true
    })

    var $el = $('<div class="amount-input">').html(template(opts))
    , ctrl = {
        $el: $el,
        opts: opts
    }
    , $amount = $el.find('.amount')
    , $amountField = $amount.field('amount')
    , $currency = $el.find('[name="currency"]')
    , $currencies = $el.find('.currencies')

    function clearErrors() {
        $amount.removeClass('has-error is-too-high is-invalid has-too-high-precision is-too-small')
    }

    ctrl.currency = function(val) {
        if (val !== undefined) {
            if (opts.showAvailable && api.balances[val]) {
                var avail = api.balances[val].available
                , maxPrecision = api.currencies[val].scale

                $currency.html(format('%s <small>(%s)</small>', val, numbers(avail, {
                    maxPrecision: maxPrecision
                })))
            } else {
                $currency.text(val)
            }
            $currency.attr('data-currency', val)
            return ctrl
        }
        return $currency.attr('data-currency')
    }

    ctrl.value = function(val) {
        if (val !== undefined) {
            $amountField.val(numbers(val))
            return ctrl
        }
        return $amountField.parseNumber()
    }

    ctrl.validate = function() {
        clearErrors()

        var val = ctrl.value()

        if (val === null) {
            debug('invalid because value is null')
            $amount.addClass('has-error is-invalid')
            return
        }

        debug('in validate, value is %s', val)

        var valn = num(val)
        , currency = ctrl.currency()

        if (opts.max !== undefined) {
            var max = _.isFunction(opts.max) ? opts.max(currency) : opts.max

            debug('max is: %s', max)

            if (valn.gt(num(max))) {
                debug('invalid because %s > %s', val, max)
                $amount.addClass('has-error is-too-high')
                return
            }
        }

        if (opts.min !== undefined) {
            var min = _.isFunction(opts.min) ? opts.min(currency) : opts.min

            debug('min is: %s', min)

            if (valn.lt(num(min))) {
                debug('invalid because %s < %s', val, min)
                $amount.addClass('has-error is-too-small')
                return
            }
        }

        if (opts.minE !== undefined) {
            var minE = _.isFunction(opts.minE) ? opts.minE(currency) : opts.minE

            debug('minE is: %s', minE)

            if (valn.lte(num(minE))) {
                debug('invalid because %s <= %s', val, minE)
                $amount.addClass('has-error is-too-small')
                return
            }
        }

        var maxPrecision = _.result(opts, 'maxPrecision')

        // Default to max precision of the currency
        if (maxPrecision === undefined) {
            maxPrecision = api.currencies[currency].scale
        }

        debug('max precision %s', maxPrecision === undefined ? 'none' : maxPrecision)

        if (typeof maxPrecision == 'number') {
            var precision = valn.get_precision()

            if (precision > maxPrecision) {
                $amount.addClass('has-error has-too-high-precision')
                .find('.too-high-precision')
                .html(i18n('shared.amount-input.amount.too high precision', maxPrecision))
                return
            }
        }

        debug('valid')
        return true
    }

    // Remove errors when the user types
    $amountField.on('keyup', function(e) {
        // Unless tab or enter
        if  (~[7, 13].indexOf(e.which)) return

        clearErrors()
    })

    // Fixed currency
    if (!opts.currency && opts.currencies.length == 1) {
        opts.currency = opts.currencies[0]
    }

    if (!opts.currency) {
        opts.currency = opts.currencies[0]
    }

    ctrl.currency(opts.currency)

    // Multiple currencies
    if (opts.currencies.length > 1) {
        debug('showing multiple currencies (%s)', opts.currencies.length)

        // Change on click in dropdown
        $currencies.on('click', 'li', function(e) {
            e.preventDefault()
            var $li = $(this).closest('li')
            , currency = $li.attr('data-currency')

            // Unchanged
            if (currency == ctrl.currency()) return

            ctrl.currency(currency)
            clearErrors()
            $amountField.focus()
        })

        $currencies.html($.map(opts.currencies, function(x) {
            return $(format('<li><a href="#">%s</a>', x))
            .attr('data-currency', x)
        }))
    }

    if (opts.value !== undefined) {
        ctrl.value(opts.value)
    }

    if (opts.showAvailable) {
        var renderCurrencies = function() {
            debug('re-rendering currencies after update')

            $currencies.html($.map(opts.currencies, function(x) {
                return $(format('<li><a href="#">%s (%s)</a>', x,
                    numbers(api.balances[x].available)))
                .attr('data-currency', x)
            }))
        }

        api.on('balances', renderCurrencies)
        api.balances.value && renderCurrencies()

        $el.on('remove', function() {
            api.off('balances', renderCurrencies)
        })
    }

    // User might not be logged in yet
    if (opts.showAvailable && !api.balances.value) {
        api.once('balances', function() {
            ctrl.currency(ctrl.currency())
        })
    }

    $el.toggleClass('is-fixed-currency', opts.currencies.length == 1)

    return ctrl
}
