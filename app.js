function sign(form, secret) {
    var body = JSON.stringify(form)
    body += secret

    var bits = sjcl.hash.sha256.hash(body)
    return sjcl.codec.base64.fromBits(bits)
}

var _ = require('underscore')
, Backbone = require('backbone')
, app = module.exports = {
    router: null,

    api: {
        secret: null,
        key: null,

        headers: function(form, key, secret) {
            return {
                'snow-key': key || this.key,
                'snow-sign': sign(form || {}, secret || this.secret)
            }
        }
    },

    hashCredentials: function(email, password) {
        return {
            key: sjcl.codec.base64.fromBits(sjcl.hash.sha256.hash(email.toLowerCase())).slice(0, 20),
            secret: sjcl.codec.base64.fromBits(sjcl.hash.sha256.hash(password)).slice(0, 20)
        }
    },

    errorFromXhr: function(xhr) {
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
    },

    section: function(value, render) {
        if (!_.isUndefined(value) && value !== app.section.value) {
            if (app.section.value) {
                app.section.value.dispose();
            }

            app.section.value = value;
            value.show(value);

            $('#section').html(value.$el);
        }

        return app.section.value || null;
    },

    authorize: function() {
        if (this.api.key) return true
        Backbone.history.navigate('login?after=' + window.location.hash.substr(1), true)
        return false
    }
}
