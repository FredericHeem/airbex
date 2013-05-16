var api = require('./api')()
, router = require('./router')()
, $app = $('body')
, app = require('./app')
, debug = require('debug')
debug.enable('*')

require('./routes')(app, api, router)

if (window.analytics) {
    require('./segment')(app, api)
}

app.on('user', function(user) {
    console.log(user)
    $app.toggleClass('is-logged-in', !!user)
    $app.toggleClass('is-admin', user && user.admin)

    if (!user.phone) {
        var verifyphone = require('./controllers/verifyphone')(app, api)
        $app.append(verifyphone.$el)
        verifyphone.$el.modal({
            keyboard: false,
            backdrop: 'static'
        })
    }
})

app.bitcoinAddress = (function() {
    var address
    return function() {
        var d = $.Deferred()
        if (address) d.resolve(address)
        return api.call('v1/BTC/address')
        .then(function(result) {
            return result.address
        })
    }
})()

app.litecoinAddress = (function() {
    var address
    return function() {
        var d = $.Deferred()
        if (address) d.resolve(address)
        return api.call('v1/LTC/address')
        .then(function(result) {
            return result.address
        })
    }
})()

app.rippleAddress = (function() {
    var address
    return function() {
        var d = $.Deferred()
        if (address) d.resolve(address)
        return api.call('v1/ripple/address')
        .then(function(result) {
            return result.address
        })
    }
})()

var language = $.cookie('language') || null
app.i18n = window.i18n = require('./i18n')(language)
$.fn.i18n = function() {
    $(this).html(app.i18n.apply(app.i18n, arguments))
}

var header = require('./controllers/header')(app, api)
$app.find('.header').replaceWith(header.$el)

$.fn.field = function(name, value) {
    var $fields = $(this).find('[name="' + name + '"]')

    if (value !== undefined) {
        $fields.each(function() {
            $(this).val(value)
        })
    }

    return $fields
}

$app.on('click', 'a[href="#set-language"]', function(e) {
    e.preventDefault()
    var language = $(this).attr('data-language')
    console.log('changing language to ' + language + ' with cookie')
    $.cookie('language', language, { expires: 365 * 10 })

    window.location.reload ? window.location.reload() : window.location = '/'
})

$.fn.enabled = function(value) {
    if (typeof value != 'undefined') {
        return $(this).prop('disabled', !value)
        .toggleClass('disabled', !value)
    }
    return !this.prop('disabled')
}

$.fn.fadeAway = function(delay) {
    return $(this).fadeOut(delay || 500, function() { $(this).remove() })
}
