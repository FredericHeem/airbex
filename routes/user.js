var Backbone = require('backbone')
, app = require('../app')
, Views = require('../views')
, UserRouter = module.exports = Backbone.Router.extend({
    routes: {
        'my/accounts': 'userAccounts',
        'my/orders': 'userOrders',
        'my/transactions': 'userTransactions'
    },

    userAccounts: function() {
        if (!app.authorize()) return;

        var collection = new Backbone.Collection();
        var view = new Views.UserAccountsView({ collection: collection });
        app.section(view, true);

        collection.fetch({
            url: app.api.url + '/private/accounts',
            headers: app.api.headers()
        })
    },

    userOrders: function() {
        if (!app.authorize()) return;

        var collection = new Models.OrderCollection();
        collection.fetch({
            url: app.api.url + '/orders',
            headers: app.api.headers()
        });

        var view = new Views.UserOrdersView({ collection: collection });
        app.section(view, true);
    },

    userTransactions: function() {
        if (!app.authorize()) return
        var collection = new Models.TransactionCollection()
        collection.fetch({
            url: app.api.url + '/accounts/transactions',
            headers: app.api.headers()
        })
        var view = new Views.UserTransactionsView({
            collection: collection
        })
        app.section(view, true)
    },
})
