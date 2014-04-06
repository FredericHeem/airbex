var format = require('util').format
, _ = require('lodash')
, debug = require('./debug')('snow:ripple')

// Resolve email or user+domain to { address: 'x', tag: 123 }
exports.federation = function(user, domain) {
    // Called with only email
    if (domain === undefined) {
        var match = /^(\S+)@(\S+)$/.exec(user)
        if (!match) return $.Deferred().reject('invalid')
        return exports.federation(match[1], match[2])
    }

    var url = format('ripple/federation?domain=%s&user=%s', domain, user)
    return api.call(url)
    .then(function(res) {
        if (res.result == 'error') {
            if (res.error == 'noSuchUser') {
                return null
            }

            return $.Deferred().reject(res.error || 'unknown')
        }

        debug('resolved federation user %s', JSON.stringify(res))

        return {
            address: res.federation_json.destination_address || res.federation_json.service_address,
            tag: res.federation_json.tag
        }
    })
}

// Resolve a string or object destination
// andreas@justcoin.com: Federation (requires lookup)
// r12312312312312: Ripple
exports.resolve = function(val) {
    if (_.isString(val)) {
        debug('resolving from string %s', val)

        if (val.match(/^r[a-z0-9]{26,33}$/i)) {
            return exports.resolve({ type: 'ripple', address: val })
        }

        if (val.match(/^\S+@\S+$/)) {
            return exports.resolve({ type: 'federation', address: val })
        }

        return $.Deferred().reject('unknown type')
    }

    if (val.type == 'ripple') {
        return val
    }

    if (val.type == 'federation') {
        debug('resolving from federation %s', val.address)
        return exports.federation(val.address)
        .then(function(res) {
            if (!res) return $.Deferred().reject('not found')
            return _.extend({
                federation: val.address
            }, res)
        })
    }

    throw new Error('Unknown destination type ' + val.type)
}

exports.trustFrom = function(account, currency) {
    debug('looking up trust from %s (%s)', account, currency)

    return api.call('v1/ripple/trust/' + account)
    .then(function(lines) {
        return lines[currency] || {
            balance: '0',
            limit: '0'
        }
    })
}
