/* global -api */
var _ = require('lodash')
, sjcl = require('./lib/sjcl/sjcl.js')
, emitter = require('./helpers/emitter')
, api = module.exports = emitter()

function sha256(s) {
    var bits = sjcl.hash.sha256.hash(s)
    return sjcl.codec.hex.fromBits(bits)
}

function keyFromCredentials(sid, email, password) {
    return sha256(sid + sha256(email + password))
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
    .then(null, function(err) {
        if (err.name == 'SessionNotFound') {
            $.removeCookie('session', { path: '/' })

            setTimeout(function() {
                location.reload()
            }, 10e3)
        }

        return err
    })
}

api.whoami = function() {
    return api.call('v1/whoami').done(function(user) {
        api.user = user
        api.trigger('user', user)
        $app.addClass('is-logged-in')
    })
    .fail(function(err) {
        if (err.name == 'OtpRequired') {
            router.go('login')
        }
    })
}

api.login = function(email, password, otp) {
    return api.call('security/session', { email: email })
    .then(function(res) {
        var key = keyFromCredentials(res.id, email, password)
        $.cookie('session', key, {
            path: '/',
            secure: window.location.protocol == 'https:'
        })

        return api.call('v1/twoFactor/auth', {
            otp: otp
        })
        .then(api.whoami)
    })
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

api.logout = function() {
    $.removeCookie('session')
    api.user = null
    require('./authorize').admin()
}
