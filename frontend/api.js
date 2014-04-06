/* global -api */
var _ = require('lodash')
, sjcl = require('./vendor/sjcl/sjcl')
, emitter = require('./helpers/emitter')
, api = module.exports = emitter()
, callingCodes = require('./assets/callingcodes.json')
, debug = require('./helpers/debug')('snow:api')
, authorize = require('./authorize')

function shortSha(s) {
    return s.substr(0, 4)
}

function sha256(s) {
    var bits = sjcl.hash.sha256.hash(s)
    return sjcl.codec.hex.fromBits(bits)
}

api.getUserKey = function(email, password) {
    return sha256(email.toLowerCase() + password)
}

function keyFromCredentials(sid, email, password) {
    var ukey = api.getUserKey(email, password)
    return keyFromUserKey(sid, ukey)
}

function keyFromUserKey(sid, ukey) {
    var skey = sha256(sid + ukey)
    debug('created skey %s from sid %s and ukey %s', shortSha(skey),
        shortSha(sid), shortSha(ukey))
    return skey
}

function formatQuerystring(qs) {
    var params = _.map(qs, function(v, k) {
        if (v === null) return null
        if (_.isString(v) && !v.length) return k
        return k + '=' + encodeURIComponent(v)
    })

    params = _.filter(params, function(x) {
        return x !== null
    })

    return params.length ? '?' + params.join('&') : ''
}

api.call = function(method, data, options) {
    function retryWithOtp(msgPrefix) {
        debug('OtpRequired received, retrying')

        return authorize.otp(msgPrefix)
        .then(function(otp) {
            if (otp === null) {
                debug('authorize.otp returned null. user has cancelled')

                var err = new Error('Two-factor authentication cancelled')
                err.name = 'TwoFactorCancelled'
                return $.Deferred().reject(err)
            }

            debug('retrying request with otp %s', otp)

            return api.call(method, _.extend({ otp: otp }, data), options)
            .then(null, function(err) {
                if (err.name == 'WrongOtp') {
                    debug('Wrong OTP supplied. Can try again.')
                    return retryWithOtp(i18n('api.call.wrong otp'))
                }

                if (err.name == 'BlockedOtp') {
                    debug('OTP is blocked. Can try again.')
                    return retryWithOtp(i18n('api.call.blocked otp'))
                }

                return err
            })
        })
    }

    var settings = {
        url: '/api/' + method
    }

    options || (options = {})
    options.qs = options.qs || {}
    options.qs.ts = Math.floor(new Date())

    if (options.type) settings.type = options.type
    else if (data) settings.type = 'POST'

    if (data) {
        settings.contentType = 'application/json; charset=utf-8'
        settings.data = JSON.stringify(data)
    }

    if (_.size(options.qs)) {
        settings.url += formatQuerystring(options.qs)
    }

    var xhr = $.ajax(settings)
    xhr.settings = settings

    return xhr
    .then(null, function(xhr, statusText, status) {
        var body = errors.bodyFromXhr(xhr)

        var error = {
            xhr: xhr,
            xhrOptions: options,
            body: body,
            statusText: statusText,
            status: status,
            name: body && body.name ? body.name : null,
            message: body && body.message || null
        }

        return error
    }).then(null, function(err) {
        debug('Error from XHR (generic handler running): %s', err.name || 'Unnamed')

        if (err.name == 'OtpRequired' && !options.authorizing) {
            debug('%s error received and not authorizing. can retry with otp', err.name)
            return retryWithOtp()
        }

        if (~['SessionNotFound'].indexOf(err.name)) {
            if (!options.authorizing) {
                debug('invalidating "session" because of %s', err.name)
                $.removeCookie('session', { path: '/' })
                location.reload()
                return $.Deferred()
            }
        }

        return err
    })
}

api.securityLevel = function(val) {
    if (val !== undefined) {
        $app
        .removeClasses(/^has-security-level/)
        .addClass('has-security-level-' + val)

        api.user.securityLevel = val
        return api
    }
    return api.user.securityLevel
}

api.loginWithKey = function(key) {
    if (key) {
        debug('logging in with key %s', key)
        $.cookie('session', key, {
            path: '/',
            secure: window.location.protocol == 'https:'
        })
    }

    return api.call('v1/whoami', null, { authorizing: true })
    .then(function(user) {
        $.cookie('existingUser', true, { path: '/', expires: 365 * 10 })

        api.user = user
        api.securityLevel(user.securityLevel)

        api.user.countryFriendly = function() {
            if (!user.country) return null
            var item = _.find(callingCodes, { code: user.country })
            return item ? item.name : 'Unknown'
        }

        api.trigger('user', user)

        $app.addClass('is-logged-in')
        .addClass('is-user-country-' + (api.user.country || 'unknown'))
    })
}

api.logout = function() {
    debug('logging out')

    api.user = null

    if ($.cookie('session')) {
        return api.call('security/session', null, { type: 'DELETE', authorizing: true })
        .then(null, function(err) {
            if (err.name == 'SessionNotFound') {
                debug('ignoring session not found in logout')
                return $.Deferred().resolve()
            }
            return err
        })
        .always(function() {
            $.removeCookie('session', { path: '/' })
            
            alertify.log(i18n('logout.message'))
        })
    }

    return $.Deferred().resolve()
}

api.loginWithUserKey = function(email, userKey) {
    debug('creating session for %s', email)
    return api.call('security/session', { email: email }, { authorizing: true })
    .then(function(res) {
        debug('retrieved session id: %s', res.id)
        var key = keyFromUserKey(res.id, userKey)
        return api.loginWithKey(key)
    })
}

api.login = function(email, password) {
    debug('creating session for %s', email)
    return api.call('security/session', { email: email }, { authorizing: true })
    .then(function(res) {
        debug('retrieved session id: %s', res.id)
        var key = keyFromCredentials(res.id, email, password)
        return api.loginWithKey(key)
    })
}

api.twoFactor = function(email, password, otp) {
    return api.call('v1/twoFactor/auth', {
        otp: otp
    }, { authorizing: true }).then(function() {
        return api.loginWithKey()
    })
}

api.register = function(email, password) {
    var key = sha256(email.toLowerCase() + password)
    return api.call('v1/users', {
        email: email,
        key: key
    })
}

api.balances = function() {
    return api.call('v1/balances')
    .done(function(balances) {
        var sortOrder = _.pluck(api.currencies.value, 'id')

        api.balances.current = balances.sort(function(a, b) {
            return sortOrder.indexOf(a.currency) - sortOrder.indexOf(b.currency)
        })

        _.each(balances, function(item) {
            api.balances[item.currency] = item
            api.trigger('balances:' + item.currency, item)
        })

        api.trigger('balances', balances)
    })
}

api.currencies = function() {
    var sortOrder = ['USD', 'CHF', 'EUR', 'NOK', 'BTC', 'LTC', 'XRP']

    return api.call('v1/currencies')
    .done(function(currencies) {
        api.currencies.value = currencies.sort(function(a, b) {
            return sortOrder.indexOf(a.id) - sortOrder.indexOf(b.id)
        })

        _.each(currencies, function(item) {
            api.currencies[item.id] = item
            api.trigger('currencies:' + item.id, item)
        })

        api.trigger('currencies', currencies)
    })
}

api.bootstrap = function() {
    return $.when(
        api.currencies(),
        api.markets()
    ).done(function() {
        $app.removeClass('is-loading')
    })
}

api.sendToUser = function(email, amount, currency, allowNewUser) {
    return api.call('v1/send', {
        email: email,
        amount: amount,
        currency: currency,
        allowNewUser: allowNewUser
    })
}

api.resetPasswordEnd = function(email, phoneCode, newPassword) {
    var key = sha256(email.toLowerCase() + newPassword)
    , body = { email: email, code: phoneCode, key: key }

    return api.call('v1/resetPassword/end', body, { type: 'POST' })
}

api.changePassword = function(newPassword) {
    var newKey = sha256(api.user.email.toLowerCase() + newPassword)
    return api.call('v1/changePassword', { key: newKey })
}

api.patchUser = function(attrs) {
    return api.call('v1/users/current', attrs, { type: 'PATCH' })
}

api.markets = function() {
    return api.call('v1/markets')
    .then(function(markets) {
        var sortOrder = ['BTCUSD', 'BTCEUR', 'BTCCHF', 'BTCNOK', 'LTCBTC', 'BTCXRP']

        api.markets.value = markets.sort(function(a, b) {
            return sortOrder.indexOf(a.id) - sortOrder.indexOf(b.id)
        })

        _.each(markets, function(item) {
            api.markets[item.id] = item
            api.trigger('markets:' + item.id, item)
        })

        api.trigger('markets', markets)
    })
}

api.depth = function(id) {
    debug('retrieving depth for %s...', id)

    return api.call('v1/markets/' + id + '/depth')
    .then(function(depth) {
        debug('depth retrieved for %s. %s bids, %s asks', id,
            depth.bids.length, depth.asks.length)

        api.depth[id] = depth
        api.trigger('depth', { market: id, depth: depth })
        api.trigger('depth:'+ id, depth)

        return depth
    })
}

// curl -H "Content-type: application/json" -X POST \
// -d '{ "amount": "123.45", "currency": "BTC" }' \
// https://justcoin.com/api/v1/vouchers
//
// { "voucher": "A1B2C3E4F5FF" }
api.createVoucher = function(amount, currency) {
    return api.call('v1/vouchers', {
        amount: amount,
        currency: currency
    }).then(function(res) {
        return res.voucher
    })
}

// curl -X POST https://justcoin.com/api/v1/vouchers/A1B2C3E4F5FF/redeem
//
// 200: { "amount": "123.45", "currency": "BTC" }
// 204: (voucher cancelled)
api.redeemVoucher = function(code) {
    return api.call('v1/vouchers/' + code + '/redeem', null, { type: 'POST' })
    .then(function(body, status, xhr) {
        if (xhr.status == 204) {
            return null
        }

        return body
    })
}

api.bitcoinAddress = function() {
    return api.call('v1/BTC/address')
    .then(function(result) {
        return result.address
    })
    .done(function(address) {
        api.bitcoinAddress.value = address
        api.trigger('bitcoinAddress', address)
    })
}

api.litecoinAddress = function() {
    return api.call('v1/LTC/address')
    .then(function(result) {
        return result.address
    })
    .done(function(address) {
        api.trigger('litecoinAddress', address)
    })
}

api.rippleAddress = function() {
    if (api.rippleAddress.value) {
        return $.Deferred().resolve(api.rippleAddress.value)
    }

    return api.call('v1/ripple/address')
    .then(function(result) {
        return result.address
    })
    .done(function(address) {
        api.rippleAddress.value = address
        api.trigger('rippleAddress', address)
    })
}

api.activities = function(since) {
    var options = {
        qs: {
        }
    }

    if (since !== undefined) {
        options.qs.since = since
    }

    return api.call('v1/activities', null, options)
    .done(function(items) {
        api.trigger('activities', items)
    })
}

api.bankAccounts = function() {
    return api.call('v1/bankAccounts')
}

api.feeRatio = function(market) {
    return 0.005
}

api.defaultDigitalCurrency = function() {
    // todo: bal
    return 'BTC'
}

api.defaultMarket = function() {
    return 'BTC' + api.defaultFiatCurrency()
}

api.defaultFiatCurrency = function() {
    debug('guessing user default fiat currency')

    if (api.balances.current) {
        debug('trying to guess on balances')

        var sortedFiats = _.filter(api.balances.current, function(x) {
            return x.balance > 0 && api.currencies[x.currency].fiat
        }).sort(function(a, b) {
            return b.balance - a.balance
        })

        var fiat = sortedFiats[0]

        if (fiat) {
            debug('guessing from highest sorted fiat: %s (%s)', fiat.currency, fiat.balance)
            return fiat.currency
        } else {
            debug('no fiat balances to guess from')
        }
    }

    var sepa = require('./assets/sepa.json')

    if (!api.user || !api.user.country) {
        debug('user is not logged in / no country set')

        if (!i18n.desired) {
            debug('user has no desired language. guessing USD')
            return 'EUR'
        }

        var countryCodeGuess = i18n.desired.substr(i18n.desired.length - 2, 2)

        debug('country code guess %s (from desired lang %s)', countryCodeGuess || '(none)', i18n.desired)

        if (countryCodeGuess.length != 2) {
            debug('no country code guess, guessing USD')
            return 'EUR'
        }

        if (countryCodeGuess == 'NO') {
            debug('country code guess is NO, guessing NOK')
            return 'NOK'
        }

        if (~sepa.indexOf(countryCodeGuess)) {
            debug('country code guess is in SEPA, guessing EUR')
            return 'EUR'
        }

        debug('not sepa, guessing USD')

        return 'EUR'
    }

    if (api.user.country == 'NO') {
        debug('user country is NO, guessing NOK')
        return 'NOK'
    }

    if (~sepa.indexOf(api.user.country)) {
        debug('user is in sepa, guessing EUR')
        return 'EUR'
    }

    debug('user is not in sepa')

    return 'EUR'
}
