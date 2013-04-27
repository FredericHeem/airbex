var SectionView = require('./SectionView')
, app = require('../app')
, Backbone = require('backbone')
, _ = require('underscore')
, Models = require('../models')
, app = require('../app')
, sjcl = require('../vendor/sjcl')
, LoginView = module.exports = SectionView.extend({
    section: null,

    events: {
        'click button.login': 'login',
        'click a[href="#replace-legacy-api-key"]': 'replaceLegacyApiKey'
    },

    initialize: function() {
        this.model = new Models.User()
    },

    replaceLegacyApiKey: function(email, password) {
        return $.ajax({
            type: 'POST',
            url: app.apiUrl + '/replaceLegacyApiKey',
            dataType: 'json',
            data: {
                oldKey: sjcl.codec.base64.fromBits(sjcl.hash.sha256.hash(email.toLowerCase())).slice(0, 20),
                oldSecret: sjcl.codec.base64.fromBits(sjcl.hash.sha256.hash(password)).slice(0, 20),
                newKey: app.keyFromCredentials(email, password)
            }
        })
        .then(function() {
            Alertify.log.success('Your user account has been transitioned from the legacy login system. Yay!')
        })
    },

    login: function(e) {
        e && e.preventDefault()

        if (app.user) {
            console.error('The user is already logged in. Concurrency issues?')
            return
        }

        var that = this
        , email = this.$el.find('.email').val()
        , password = this.$el.find('.password').val()
        , apiKey = app.keyFromCredentials(email, password)

        var result = this.model.fetch({
            url: app.apiUrl + '/whoami',
            username: 'api',
            password: apiKey
        })

        if (!result) {
            return alert(this.model.validationError)
        }

        this.toggleInteraction(false)

        result.then(function() {
            app.setUser(that.model, apiKey)
            Backbone.history.navigate('my/accounts', true)
        }, function(xhr) {
            that.toggleInteraction(true)

            var error = app.errorFromXhr(xhr)

            if (xhr.status === 401) {
                that.replaceLegacyApiKey(email, password)
                .then(function() {
                    that.login()
                }, function() {
                    console.log(arguments)
                    return alert('Wrong username/password')
                })
            } else {
                alert(JSON.stringify(error, null, 4))
            }
        })
    },

    toggleInteraction: function(value) {
        this.$el.find('input button')
        .prop('disabled', !value)
        .toggleClass('disabled', !value)
    },

    render: function() {
        var that = this
        this.$el.html(require('../templates/login.ejs')());

        setTimeout(function() {
            that.$el.find('.email').focus()
        }, 0)

        return this;
    }
})
