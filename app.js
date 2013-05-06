var EventEmitter = require('events').EventEmitter
, _ = require('lodash')
, app = module.exports = new EventEmitter()

app.user = function(value) {
    if (!_.isUndefined(value)) {
        app._user = value
        app.emit('user', value)
    }
    return app._user
}

app.section = function(name) {
    $('.header .nav .' + name).addClass('active').siblings().removeClass('active')
}

app.balances = function(value) {
    if (!_.isUndefined(value)) {
        app._balances = value
        app.emit('balances', value)
    }
    return app._balances
}

app.alertXhrError = function(err) {
    alert(JSON.stringify(app.errorFromXhr(err), null, 4))
}

app.authorize = function() {
    if (app._user) return true
    window.location.hash = '#login?after=' + window.location.hash.substr(1)
    return false
}

app.errorFromXhr = function(xhr) {
    var body = xhr.responseText

    if (xhr.getAllResponseHeaders().match(/Content-Type: application\/json/i)) {
        try {
            return JSON.parse(body)
        } catch (err) {
            return {
                name: 'ErrorBodyInvalid',
                message: 'Failed to parse JSON error body',
                body: body
            }
        }
    }

    return {
        name: 'UnknownErrorFormat',
        message: 'Error is not JSON',
        body: body
    }
}
