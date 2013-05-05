module.exports = function() {
    var api = {}
    , callbacks = $.Callbacks()
    api.on = callbacks.add
    api.emit = callbacks.fire

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

        if (options.method) settings.method = options.method

        if ($.isPlainObject(data)) {
            settings.data = data
        } else if (data) {
            settings.url += '/' + data
        }

        return $.ajax(settings)
    }

    api.login = function(email, password) {
        return api.call('whoami', null, { key: keyFromCredentials(email, password) })
        .then(function(user) {
            api.emit('login', user)
        })
    }

    return api
}
