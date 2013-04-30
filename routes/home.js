var Backbone = require('backbone')
_ = require('underscore')
, async = require('async')
, app = require('../app')
, HomeView = require('../views/HomeView')
, ErrorView = require('../views/ErrorView')
, RouteNotFoundView = require('../views/RouteNotFoundView')
, RippleOutView = require('../views/RippleOutView')
, Router = module.exports = Backbone.Router.extend({
    home: function() {
        app.section(new HomeView())
    },

    routes: {
        '': 'home',
        'my/rippleout/:sid': 'rippleOut',
        '*path': 'routeNotFound'
    },

    error: function(error) {
        var view = new ErrorView({
            error: error
        })
        app.section(view)
    },

    routeNotFound: function() {
        console.log('route not found for', window.location.hash)
        app.section(new RouteNotFoundView(), true)
    },

    rippleOut: function(currency) {
        if (!app.authorize()) return
        var view = new RippleOutView({
            currency: currency
        })
        app.section(view, true)
    }
})
