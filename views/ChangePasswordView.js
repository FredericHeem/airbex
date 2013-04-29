var _ = require('underscore')
, app = require('../app')
, Backbone = require('Backbone')
, SectionView = require('./SectionView')
, ChangePasswordView = module.exports = SectionView.extend({
    events: {
        'submit form': 'submit'
    },

    initialize: function() {
        var template = require('../templates/change-password.ejs')
        this.$el.html(template())
    },

    submit: function(e) {
        var that = this
        e.preventDefault()

        var password = this.$el.find('.new-password input').val()
        , repeat = this.$el.find('.new-password-repeat input').val()

        if (password.length < 5) return alert('Password is too short')
        if (password !== repeat) return alert('Passwords do not match')

        var newKey = app.keyFromCredentials(app.user.get('email'), password)

        that.toggleInteraction(false)

        $.ajax({
            type: 'POST',
            url: app.apiUrl + '/replaceApiKey',
            username: 'api',
            password: app.apiKey,
            dataType: 'json',
            data: {
                key: newKey
            }
        })
        .then(function() {
            app.apiKey = newKey
            Alertify.log.success('Your password has been changed')
            Backbone.history.navigate('my/balances', true)
        }, function(xhr) {
            var error = app.errorFromXhr(xhr)
            alert(JSON.stringify(error, null, 4))
            that.toggleInteraction(true)
        })
    }
})
