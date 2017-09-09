/* global -api */
var _ = require('lodash')
, sjcl = require('./vendor/sjcl/sjcl')
, api = module.exports
, debug = require('./helpers/debug')('api')
, authorize = require('./authorize')
, Q = require('q')

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

api.keyFromCredentials = function(sid, email, password) {
    var ukey = api.getUserKey(email, password)
    return api.keyFromUserKey(sid, ukey)
}

api.keyFromUserKey = function(sid, ukey) {
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

api.currencies = {};
api.markets = {};
api.balances = {};

api.call = function(method, data, options, deferredIn) {
    
    var deferred = deferredIn || Q.defer();
    debug('call data: ', JSON.stringify(data))
            
    function retryWithPassword(token, msgPrefix) {
        debug('retryWithPassword method: %s, token: %s, msg: %s', method, token, msgPrefix)

        return authorize.password(msgPrefix)
        .then(function(password) {
            if (password === null) {
                debug('authorize.password returned null. user has cancelled')
                var err = new Error('Password cancelled')
                err.name = 'PasswordCancelled'
                deferred.reject(err)
            } else {
                debug('retryWithPassword password %s', password)
                var sessionKey = api.keyFromCredentials(token, api.user.email.toLowerCase(), password)
                
                data.sessionKey = sessionKey;
                return api.call(method, data, options, deferred)
                .fail(function(err) {
                    if(err){
                        debug('retryWithPassword error')
                        deferred.reject(err)
                    } else {
                        debug('retryWithPassword password mismatch')
                        return retryWithPassword(token, "Password mismatch")
                    }
                })
            }
        })
    }
    
    function retryWithOtp(msgPrefix) {
        debug('retryWithOtp: ', msgPrefix)

        return authorize.otp(msgPrefix)
        .then(function(otp) {
            if (otp === null) {
                debug('authorize.otp returned null. user has cancelled')

                var err = new Error('Two-factor authentication cancelled')
                err.name = 'TwoFactorCancelled'
                return deferred.reject(err)
            }

            debug('retrying request with otp %s', otp)
            data.otp = otp
            return api.call(method, data, options, deferred)
            .then(null, function(err) {
                debug('OTP is blocked. Can try again.')
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
    
    Q.promise(function () {
        xhr.then(function (data) {
            deferred.resolve(data);
        }, function (jqXHR, statusText, status) {
            delete jqXHR.then; // treat xhr as a non-promise
            var body = errors.bodyFromXhr(jqXHR);
            
            var error = {
                    xhr: xhr,
                    xhrOptions: options,
                    body: body,
                    statusText: statusText,
                    status: status,
                    name: body && body.name ? body.name : null,
                    message: body && body.message || null,
                    token: body && body.token || null
            }
            debug('api error: %s', JSON.stringify(error));
            var name = error.name;
            var message = error.message;
            var token = error.token;
            if (name == 'PasswordRequired' && !options.authorizing) {
                debug('%s, token %s', message, token)
                return retryWithPassword(token, "Please enter your pasword")
            }
            if (name == 'PasswordInvalid' && !options.authorizing) {
                debug('%s, token %s', message, token)
                return retryWithPassword(token, "Incorrect password, please enter your pasword")
            }
            if (name == 'OtpRequired' && !options.authorizing) {
                debug('%s error received and not authorizing. can retry with otp', name)
                return retryWithOtp()
            }
            if (name == 'WrongOtp' && !options.authorizing) {
                debug('%s error received and not authorizing. can retry with otp', name)
                return retryWithOtp(i18n('api.call.wrong otp'))
            }
            if (name == 'BlockedOtp' && !options.authorizing) {
                debug('%s error received and not authorizing. can retry with otp', name)
                return retryWithOtp(i18n('api.call.blocked otp'))
            }
            
            if (~['SessionNotFound'].indexOf(name)) {
                if (!options.authorizing) {
                    debug('invalidating "session" because of %s', name)
                    $.removeCookie('session', { path: '/' })
                    location.reload()
                    return $.Deferred()
                }
            }
            
            deferred.reject(error);
        });
    });
    return deferred.promise;
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

api.sessionKeySave = function(key){
    if (key) {
        debug('sessionKeySave %s', key)
        $.cookie('session', key, {
            path: '/',
            secure: window.location.protocol == 'https:'
        })
    }
}

api.login = function(email, password) {
    debug('login for %s', email);
    return api.loginWithUserKey(email, api.getUserKey(email, password))
}

api.logout = function() {
    debug('logging out')
    api.user = null
    var deferred = Q.defer();
    if ($.cookie('session')) {
        return api.call('security/session', null, { type: 'DELETE', authorizing: true })
        .then(null, function(err) {
            if (err.name == 'SessionNotFound') {
                debug('ignoring session not found in logout')
                return deferred.resolve()
            } else {
                deferred.reject()
            }
        })
        .fin(function() {
            $.removeCookie('session', { path: '/' })
            alertify.log(i18n('logout.message'))
            deferred.resolve()
        })
    }

    return deferred.resolve()
}

api.twoFactor = function(email, password, otp) {
    return api.call('v1/twoFactor/auth', {
        otp: otp
    }, { authorizing: true }).then(function() {
        return api.loginWithSessionKey()
    })
}

api.register = function(email, password) {
    var key = sha256(email.toLowerCase() + password)
    return api.call('v1/users', {
        email: email,
        key: key
    })
}

api.onBalances = function(balances) {
    
    var sortOrder = _.pluck(api.currencies.value, 'id')

    api.balances.current = balances.sort(function(a, b) {
        return sortOrder.indexOf(a.currency) - sortOrder.indexOf(b.currency)
    })

    api.balances = {};
    
    _.each(balances, function(item) {
        api.balances[item.currency] = item
        api.trigger('balances:' + item.currency, item)
    })
    
    //debug('onBalances trigger ', balances)
    api.trigger('balances', balances)
    
}

api.onCurrencies = function(currencies) {
    debug('onCurrencies')
    var sortOrder = ['USD', 'EUR', 'CZK', 'BTC', 'LTC', 'DOGE', 'DRK']
    api.currencies.value = currencies.sort(function(a, b) {
        return sortOrder.indexOf(a.id) - sortOrder.indexOf(b.id)
    })

    _.each(currencies, function(item) {
        api.currencies[item.id] = item
        api.trigger('currencies:' + item.id, item)
    })

    api.trigger('currencies', currencies)
}

api.sendToUser = function(email, amount, currency, allowNewUser) {
    return api.call('v1/send', {
        email: email,
        amount: amount,
        currency: currency,
        allowNewUser: allowNewUser
    })
}

api.resetPasswordEnd = function(email, phoneCode, newPassword, twaFaCode) {
    var key = sha256(email.toLowerCase() + newPassword)
    , body = { email: email, code: phoneCode, key: key, otp:twaFaCode}

    return api.call('v1/resetPassword/end', body, { type: 'POST' })
}

api.changePassword = function(newPassword) {
    var newKey = sha256(api.user.email.toLowerCase() + newPassword)
    return api.call('v1/changePassword', { key: newKey })
}

api.patchUser = function(attrs) {
    return api.call('v1/users/current', attrs, { type: 'PATCH' })
}

api.getBaseCurrency = function (marketName){
    var market = api.markets[marketName];
    if(market){
        return market.bc
    } else {
        return "???"
    }
}

api.getQuoteCurrency = function (marketName){
    var market = api.markets[marketName];
    if(market){
        return market.qc
    } else {
        return "???"
    }
}

api.onMarkets = function(markets) {
    //debug('onMarkets: ', JSON.stringify(markets, null, 4))
    if(!markets) return;
    var sortOrder = ['BTCUSD', 'BTCEUR', 'LTCBTC', 'DOGEBTC', 'DRKBTC']
    
    api.markets.value = markets.sort(function(a, b) {
        return sortOrder.indexOf(a.id) - sortOrder.indexOf(b.id)
    })

    _.each(markets, function(item) {
        api.markets[item.id] = item
        api.trigger('markets:' + item.id, item)
    })

    api.trigger('markets', markets)
}

api.onMarketsInfo = function(marketsInfo) {
    debug('onMarketsInfo: ', JSON.stringify(marketsInfo, null, 4))
    if(!marketsInfo) return;
    api.marketsInfo = {};
    _.each(marketsInfo, function(item) {
        api.marketsInfo[item.id] = item
    })
}

api.onDepth = function(depth) {
    var marketId = depth.marketId;
    debug('onDepth for market ', marketId)
    //debug('onDepth for %s. %s bids, %s asks', marketId,
    //        depth.bids.length, depth.asks.length);

    api.depth[marketId] = depth
    api.trigger('depth', { market: marketId, depth: depth })
    api.trigger('depth:'+ marketId, depth)

    //return depth
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
}

api.getCryptoAddress = function(currency) {
    return api.call('v1/' + currency + '/address')
    .then(function(result) {
        var address = result.address;
        debug("getCryptoAddress %s: %s", currency, address)
        api.cryptoAddress[currency] = address;
        api.trigger('cryptoAddress' + currency, address);
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
    .then(function(items) {
        api.trigger('activities', items)
    })
}

api.bankAccounts = function() {
    return api.call('v1/bankAccounts')
}

api.setDefaultFiat = function (currency){
    $.cookie('currencyDefaultFiat', currency, { expires: 10 * 356 * 7 })
}

api.setDefaultCrypto = function (currency){
    $.cookie('currencyDefaultCrypto', currency, { expires: 10 * 356 * 7 })
}

api.defaultDigitalCurrency = function() {
    var currency = $.cookie('currencyDefaultCrypto') || 'BTC';
    return currency;
}

api.defaultMarket = function() {
	var market = $.cookie('tradeMarket') || 'BTCEUR';
    return market
}

api.isFiat = function (currency){
	return api.currencies[currency].fiat
}

api.defaultFiatCurrency = function() {
	var currency = $.cookie('currencyDefaultFiat') || 'EUR';
    return currency;
}
