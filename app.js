var _ = require('underscore')
, util = require('util')
, EventEmitter = require('events').EventEmitter
, Backbone = require('backbone')
, App = function() {
}

util.inherits(App, EventEmitter)

App.prototype.keyFromCredentials = function(email, password) {
    var concat = email.toLowerCase() + password
    , bits = sjcl.hash.sha256.hash(concat)
    , hex = sjcl.codec.hex.fromBits(bits)
    return hex
}

App.prototype.errorFromXhr = function(xhr) {
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

App.prototype.section = function(value, render) {
    if (!_.isUndefined(value) && value !== app.section.value) {
        if (app.section.value) {
            app.section.value.dispose();
        }

        app.section.value = value;
        value.show(value);

        $('#section').html(value.$el);
    }

    return app.section.value || null;
}

App.prototype.authorize = function() {
    if (this.user) return true
    Backbone.history.navigate('login?after=' + window.location.hash.substr(1), true)
    return false
}

module.exports = new App()
