/* global -api */
var _ = require('lodash')
, sjcl = require('./vendor/sjcl')
, emitter = require('./util/emitter')
, api = module.exports = emitter()

function keyFromCredentials(email, password) {
    var concat = email.toLowerCase() + password
    , bits = sjcl.hash.sha256.hash(concat)
    , hex = sjcl.codec.hex.fromBits(bits)
    return hex
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
    var settings = {
        url: '/api/' + method
    }

    options = options || {}
    options.qs = options.qs || {}
    options.qs.ts = +new Date()

    if (options.key || api.key) {
        options.qs.key = options.key || api.key
    }

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
    })
}

api.loginWithKey = function(key) {
    return api.call('v1/whoami', null, { key: key })
    .then(function(user) {
        $.cookie('apiKey', key)
        $.cookie('existingUser', true, { path: '/', expires: 365 * 10 })

        api.key = key
        api.user = user
        api.trigger('user', user)

        $app.addClass('is-logged-in')
    })
}

api.login = function(email, password) {
    var key = keyFromCredentials(email, password)
    return api.loginWithKey(key)
}

api.currencies = function() {
    return api.call('v1/currencies')
    .done(function(currencies) {
        api.currencies.value = currencies
        api.trigger('currencies', currencies)
    })
}

api.markets = function() {
    return api.call('v1/markets')
    .done(function(markets) {
        api.markets.value = markets
        api.trigger('markets', markets)
    })
}

api.bootstrap = function() {
    return $.when(
        api.currencies()
    ).done(function() {
        $app.removeClass('is-loading')
    })
}
