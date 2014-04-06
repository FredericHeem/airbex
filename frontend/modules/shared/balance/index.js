var format = require('util').format
, _ = require('lodash')

module.exports = function(opts) {
    // Allow opts as the currency
    if (typeof opts == 'string') {
        opts = {
            currency: opts
        }
    }

    _.defaults(opts, {
        tagName: 'span',
        field: 'available',
        maxPrecision: 8,
        flash: false
    })

    var ctrl = {
        $el: $(format('<%s class="shared-balance">', opts.tagName)),
        opts: opts,
        last: null
    }

    ctrl.update = function(item) {
        var value = item[opts.field]

        ctrl.$el
        .html(numbers.format(value, {
            currency: opts.currency,
            maxPrecision: opts.maxPrecision
        }))
        .attr('title', numbers.format(value, {
            currency: opts.currency
        }))

        if (opts.flash) {
            if (ctrl.last !== null && ctrl.last != value) {
                ctrl.$el.flash()
            }
            ctrl.last = value
        }
    }

    api.on('balances:' + opts.currency, ctrl.update)

    if (api.balances[opts.currency] !== undefined) {
        ctrl.update(api.balances[opts.currency])
    }

    ctrl.$el.on('remove', function() {
        api.off('balances:' + opts.currency, ctrl.update)
    })

    return ctrl
}
