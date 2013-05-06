var app = require('./app')

module.exports = function() {
    var api = {}

    function keyFromCredentials(email, password) {
        var concat = email.toLowerCase() + password
        , bits = sjcl.hash.sha256.hash(concat)
        , hex = sjcl.codec.hex.fromBits(bits)
        return hex
    }

    api.call = function(method, data, options) {
        var settings = {
            url: '/api/' + method,
            dataType: 'json'
        }

        options = options || {}

        if (options.key || api.key) {
            settings.username = 'api'
            settings.password = options.key ||api.key
        }

        if (options.type) settings.type = options.type
        else if (data) settings.type = 'POST'

        settings.data = data

        return $.ajax(settings)
    }

    api.login = function(email, password) {
        return api.call('whoami', null, { key: keyFromCredentials(email, password) })
        .then(app.user.bind(app))
    }

    api.register = function(email, password) {
        return api.call('users', {
            email: email,
            key: keyFromCredentials(email, password)
        })
        .then(api.login.bind(api, email, password))
    }

    api.balances = function() {
        api.call('balances')
        .done(app.balances.bind(app))
    }

    return api
}
