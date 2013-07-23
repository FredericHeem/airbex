/* global -numbers */
var Num = require('num')
, _ = require('lodash')

/* jshint maxcomplexity: 99 */
var numbers = module.exports = function(n, opts, currency) {
    if (typeof opts == 'number') {
        opts = { precision: opts }
    }

    opts = _.extend({ thousands: true, trim: true }, opts)

    if (currency) {
        opts.currency = currency
    }

    // Number might be Num
    n = Num(n)

    // Fixed, min and max precision
    if (opts.precision !== undefined) {
        n.set_precision(opts.precision)
    } else if (opts.maxPrecision !== undefined && n._precision > opts.maxPrecision) {
        n.set_precision(opts.maxPrecision)
    } else if (opts.minPrecision !== undefined && n._precision < opts.minPrecision) {
        n.set_precision(opts.minPrecision)
    }

    var s = n.toString()

    // Trim unnecessary zeroes
    if (!opts.precision && (opts.trim || opts.trimRight)) {
        if (~s.indexOf('.')) {
            s = s.replace(/\.?0*$/, '')
        }
    }

    // Decmial separator
    var ds = '.'
    s = s.replace(/\./, ds)

    // Thousand separator (left)
    var ts

    if (opts.thousands === true) {
        ts = ' '
    } else if (opts.thousands) {
        ts = opts.thousands
    }

    if (ts) {
        s = numbers.addThousands(s, ds, ts)
    }

    if (opts.currency) {
        s = s + ' ' + opts.currency
    }

    return s
}

numbers.addThousands = function(s, ds, ts) {
    var parts = s.split(ds)
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ts)
    return parts.join(ds)
}

numbers.format = numbers

numbers.formatAmount = function(number, currency) {
    return this.format(number, {
        currency: currency,
        thousands: true
    })
}

numbers.formatVolume = function(number, currency) {
    return this.format(number, {
        currency: currency,
        thousands: true,
        maxPrecision: 8
    })
}

numbers.formatPrice = function(number) {
    return this.format(number, {
        thousands: true,
        maxPrecision: 8
    })
}

numbers.parse = function(s) {
    // Remove spaces
    s = s.replace(/\s/g, '')

    s = s.replace(new RegExp(' ', 'g'), '')

    var allowed = [
        '0-9',
        '\\' + '.',
        '.',
        '\\' + ' '
    ]

    var expr = '^-?[' + allowed.join('') + ']+$'

    if (!new RegExp(expr).exec(s)) {
        return null
    }

    if (isNaN(+s)) {
        return null
    }

    return s
}
