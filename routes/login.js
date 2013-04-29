var Backbone = require('backbone')
, app = require('../app')
, Models = require('../models')
, Views = require('../views')
, LoginRoute = module.exports = Backbone.Router.extend({
    routes: {
    },

    initialize: function() {
        this.route(/^login(?:\?after=(.+))?/, 'login')
    },

    login: function(after) {
        var that = this
        after || (after = 'my/balances')

        var view = new Views.LoginView()
        app.section(view)
    }
})
