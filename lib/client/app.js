function sign(form, secret) {
    var body = JSON.stringify(form)
    body += secret
    console.log('signing', body, 'with secret', secret)

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
        Backbone.history.navigate('login', true)
        return false
    }
}
