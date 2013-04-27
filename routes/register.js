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
            url: app.apiUrl + '/users'
        })
        , view = new Views.RegisterView({
            model: model
        })

        view.on('register', function(e) {
            app.setUser(model, app.keyFromCredentials(e.email, e.password))
            Backbone.history.navigate(after, true)
        })

        app.section(view)
    }
})
