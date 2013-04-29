var Backbone = require('backbone')
, app = require('../app')
, Views = require('../views')
, ChangePasswordView = require('../views/ChangePasswordView')
, BalancesView = require('../views/BalancesView')
, ActivitiesView = require('../views/ActivitiesView')
, UserRouter = module.exports = Backbone.Router.extend({
    routes: {
        'my/balances': 'balances',
        'my/orders': 'userOrders',
        'my/activities': 'activities',
        'my/changePassword': 'changePassword'
    },

    balances: function() {
        if (!app.authorize()) return;

        var collection = new Backbone.Collection();
        var view = new BalancesView({ collection: collection });
        app.section(view, true);

        collection.fetch({
            url: app.apiUrl + '/balances',
            username: 'api',
            password: app.apiKey
        })
    },

    changePassword: function() {
        if (!app.authorize()) return
        app.section(new ChangePasswordView(), true)
    },

    userOrders: function() {
        if (!app.authorize()) return;

        var collection = new Models.OrderCollection();
        collection.fetch({
            url: app.apiUrl + '/orders',
            username: 'api',
            password: app.apiKey
        });

        var view = new Views.UserOrdersView({ collection: collection });
        app.section(view, true);
    },

    activities: function() {
        if (!app.authorize()) return
        var collection = new Backbone.Collection()
        collection.fetch({
            url: app.apiUrl + '/activities',
            usename: 'api',
            password: app.apiKey
        })
        var view = new ActivitiesView({
            collection: collection
        })
        app.section(view, true)
    }
})
