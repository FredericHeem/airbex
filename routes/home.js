var Backbone = require('backbone')
_ = require('underscore')
, Models = require('../models')
, Views = require('../views')
, async = require('async')
, app = require('../app')
, Router = module.exports = Backbone.Router.extend({
    initialize: function() {
        var that = this

        app.cache = require('../app.cache')
        app.cache.reload()

        app.header = new Views.HeaderView();
        app.header.render();
    },

    home: function() {
        app.section(new Views.HomeView())
    },

    routes: {
        '': 'home',
        'my/rippleout/:sid': 'rippleOut',
        '*path': 'routeNotFound'
    },

    error: function(error) {
        var view = new Views.ErrorView({
            error: error
        })
        app.section(view)
    },

    routeNotFound: function() {
        console.log('route not found for', window.location.hash)
        app.section(new Views.RouteNotFoundView(), true)
    },

    rippleOut: function(sid) {
        if (!app.authorize()) return
        var view = new Views.RippleOutView({
            securityId: sid
        })
        app.section(view, true)
    }
})

Backbone.$ = jQuery
