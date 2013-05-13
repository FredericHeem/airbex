var api = require('./api')()
, router = require('./router')()
, $app = $('body')
, app = require('./app')

require('./routes')(app, api, router)

if (window.analytics) {
    require('./segment')(app, api)
}

app.on('user', function(user) {
    $app.toggleClass('is-logged-in', !!user)
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
