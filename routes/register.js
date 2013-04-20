var Backbone = require('backbone')
, app = require('../app')
, Models = require('../models')
, Views = require('../views')
, RegisterRoute = module.exports = Backbone.Router.extend({
    routes: {
    },

    initialize: function() {
        this.route(/^register(?:\?after=(.+))?/, 'register')
    },

    register: function(after) {
        var that = this
        after || (after = 'my/accounts')

        var model = new Models.User({}, {
            url: app.apiUrl + '/public/users'
        })
        , view = new Views.RegisterView({
            model: model
        })

        view.on('register', function(e) {
            var hashes = app.hashCredentials(e.email, e.password)
            app.user = model
            app.credentials = hashes
            $('body').addClass('is-logged-in')
            $('#top .account-summary .logged-in .email').html(app.user.get('email'))
            Backbone.history.navigate(after, true)
        })

        app.section(view)
    }
})
