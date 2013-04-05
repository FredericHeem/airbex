var SectionView = require('./SectionView')
, app = require('../app')
, Backbone = require('backbone')
, _ = require('underscore')
, Models = require('../models')
, templates = require('../templates')
, app = require('../app')
, sjcl = require('../../../vendor/sjcl')
, LoginView = module.exports = SectionView.extend({
    section: null,

    events: {
        'click button.register': 'register',
        'click button.login': 'login'
    },

    hashes: function() {
        var email = this.$el.find('.email').val()
        , password = this.$el.find('.password').val()

        return {
            key: sjcl.codec.base64.fromBits(sjcl.hash.sha256.hash(email)).slice(0, 20),
            secret: sjcl.codec.base64.fromBits(sjcl.hash.sha256.hash(password)).slice(0, 20)
        }
    },

    login: function(e) {
        e.preventDefault()
        this.trigger('login', { hashes: this.hashes() })
    },

    register: function() {
        var that = this
        , model = new Models.User({ email: this.$el.find('.email').val() })
        model.save(this.hashes(), {
            url: app.api.url + '/public/users',
            success: function() {
                _.extend(app.api, that.hashes())
                app.user = model
                Backbone.history.navigate('#my/accounts', true)
            }
        })
    },

    render: function() {
        this.$el.html(templates('login')());

        return this;
    }
});
