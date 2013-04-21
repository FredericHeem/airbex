var SectionView = require('./SectionView')
, app = require('../app')
, Backbone = require('backbone')
, _ = require('underscore')
, Models = require('../models')
, app = require('../app')
, sjcl = require('../vendor/sjcl')
, RegisterView = module.exports = SectionView.extend({
    section: null,

    events: {
        'click .register': 'register'
    },

    email: function() {
        return this.$el.find('.email').val().toLowerCase()
    },

    register: function() {
        var that = this

        if (this.$el.find('.password').val().length < 5) {
            return alert('Password is too short (minimum 5)')
        }

        var result = this.model.save(_.extend({
            email: this.$el.find('.email').val()
        }, app.hashCredentials(this.email(), this.$el.find('.password').val())))

        if (!result) {
            return alert(this.model.validationError)
        }

        result.then(function() {
            that.trigger('register', {
                email: that.email(),
                password: that.$el.find('.password').val()
            })
        }, function(xhr) {
            var error = app.errorFromXhr(xhr)

            if (error.name == 'EmailAlreadyInUse') {
                return alert('The e-mail is already taken')
            }

            alert(JSON.stringify(error, null, 4))
        })
    },

    render: function() {
        this.$el.html(require('../templates/register.ejs')())

        return this;
    }
})
