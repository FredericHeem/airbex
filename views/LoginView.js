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
        'click button.login': 'login'
    },

    initialize: function() {
        this.model = new Models.User()
    },

    login: function(e) {
        e.preventDefault()

        var that = this
        , email = this.$el.find('.email').val().toLowerCase()
        , password = this.$el.find('.password').val()
        , hashes = app.hashCredentials(email, password)
        , result = this.model.fetch({
            url: app.apiUrl + '/whoami',
            headers: app.apiHeaders(null, hashes.key, hashes.secret)
        })

        if (!result) {
            return alert(this.model.validationError)
        }

        this.toggleInteraction(false)

        result.then(function() {
            app.user = that.model
            app.credentials = hashes
            $('body').addClass('is-logged-in')
            $('#top .account-summary .logged-in .email').html(that.model.get('email'))

            Backbone.history.navigate('my/accounts', true)
        }, function(xhr) {
            that.toggleInteraction(true)

            var error = app.errorFromXhr(xhr)

            if (error.code == 'UnknownApiKey' || error.code == 'BadMessageSignature') {
                return alert('Wrong username/password')
            }

            alert(JSON.stringify(error, null, 4))
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
