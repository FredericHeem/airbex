var Backbone = require('backbone')
, app = require('../app')
, RegisterView = require('../views/RegisterView')
, User = require('../models/User')
, RegisterRoute = module.exports = Backbone.Router.extend({
    routes: {
    },

    initialize: function() {
        this.route(/^register(?:\?after=(.+))?/, 'register')
    },

    register: function(after) {
        var that = this
        after || (after = 'my/balances')

        var model = new User({}, {
            url: app.apiUrl + '/users'
        })
        , view = new RegisterView({
            model: model
        })

        view.on('register', function(e) {
            app.setUser(model, app.keyFromCredentials(e.email, e.password))
            Backbone.history.navigate(after, true)
        })

        app.section(view)
    }
})
