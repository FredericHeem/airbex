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
        url: 'http://localhost:5071',
        secret: null,
        key: null,

        headers: function(form) {
            return {
                'snow-key': this.key,
                'snow-sign': sign(form || {}, this.secret)
            }
        }
    },

    section: function(value, render) {
        if (!_.isUndefined(value) && value !== app.section.value) {
            if (app.section.value) {
                console.log('disposing of previous section');
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
        console.log('not authorized')
        Backbone.history.navigate('login', true)
        return false
    }
}
