var Backbone = require('backbone')
_ = require('underscore')
, Models = require('./models')
, Views = require('./views')
, async = require('async')
, app = require('./app')
, Router = module.exports = Backbone.Router.extend({
    initialize: function() {
        var that = this
        this.allSecurities = new Models.SecurityCollection();
        this.allBooks = new Models.BookCollection();

        async.series([
            function(next) {
                that.allSecurities.fetch({
                    url: app.api.url + '/public/securities',
                    success: function() { console.log('secs', arguments); next(); },
                    error: function(e) { next(e); }
                });
            },
            function(next) {
                that.allBooks.fetch({
                    url: app.api.url + '/public/books',
                    success: function() { next(); },
                    error: function(e) { next(e); }
                });
            }
        ], function() {
            console.log('starting history');
            Backbone.history.start();
        });

        app.header = new Views.HeaderView();
        app.header.render();

        this.route(/^login(?:\?after=(.+))?/, 'login');
        this.route(/^my\/send(?:\?security=(.+))?/, 'send');

        Backbone.wrapError = _.wrap(Backbone.wrapError, this.wrapError)
    },

    wrapError: function(inner, onError, originalModel, options) {
        var onErrorWrap = function(model, xhr, options) {
            xhr.body = xhr.responseText;

            if (xhr.getAllResponseHeaders().match(/Content-Type: application\/json/i)) {
                try {
                    xhr.body = JSON.parse(xhr.responseText)
                } catch (err) {

                    console.error('failed to parse json error body', xhr.body, err)
                }
            }

            if (!onError || !onError(model, xhr, options)) {
                if (xhr.status == 401) {
                    app.session.forget()
                    return app.authorize()
                } else {
                    console.error('unhandled sync error', model, xhr, options)
                    console.log('app', app)
                    app.router.error(xhr.body)
                }
            }
        }

        return inner(onErrorWrap, originalModel, options)
    },

    home: function() {
        app.section(new Views.HomeView())
    },

    routes: {
        '': 'home',
        'books': 'books',
        'my/accounts': 'userAccounts',
        'my/orders': 'userOrders',
        'books/:book': 'book',
        'books/:book/new': 'createOrder',
        'my/withdraw/BTC': 'withdrawBTC',
        'my/deposit/BTC': 'depositBTC',
        'my/transactions': 'userTransactions',
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

    books: function() {
        var view = new Views.BooksView({
            collection: this.allBooks
        })
        app.section(view, true);
    },

    userAccounts: function() {
        console.log('route: user accounts');

        if (!app.authorize()) return;

        var collection = new Models.AccountCollection();

        collection.fetch({
            url: app.api.url + '/private/accounts',
            headers: app.api.headers()
        });

        var view = new Views.UserAccountsView({ collection: collection });
        app.section(view, true);
    },

    userOrders: function() {
        console.log('route: user orders');

        if (!app.authorize()) return;

        var collection = new Models.OrderCollection();
        collection.fetch({
            url: app.api.url + '/private/orders',
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

    send: function(security_id) {
        console.log('route: send')

        if (!app.authorize()) return

        app.user.get('accounts').fetch({
            headers: app.api.headers(),
            success: function() {
                var view = new Views.SendView({
                    app: app,
                    security_id: security_id || null
                })
                app.section(view, true)
            }
        })
    },

    login: function(after) {
        console.log('route: login');

        var view = new Views.LoginView({ after: after || 'my/accounts' });
        app.section(view, true);
    },

    book: function(pair) {
        var split = pair.split('_');

        var book = this.allBooks.fromPair(split[0], split[1]);

        if (!book) {
            throw new Error('no book found for ' + split[0] + ' and ' + split[1]);
        }

        book.get('depth').fetch({
            url: app.api.url + '/public/books/' + book.id + '/depth?grouped=0'
        });

        var view = new Views.BookView({
            model: book
         });

        app.section(view, true);
    },

    withdrawBTC: function() {
        if (!app.authorize()) return
        var view = new Views.WithdrawBTCView()
        app.section(view, true)
    },

    rippleOut: function(sid) {
        if (!app.authorize()) return
        var view = new Views.RippleOutView({
            securityId: sid
        })
        app.section(view, true)
    },

    depositBTC: function() {
        if (!app.authorize()) return

        var model = new Backbone.Model({
            address: null
        })

        model.fetch({
            url: app.api.url + '/private/deposit/BTC/address',
            headers: app.api.headers()
        })

        var view = new Views.DepositBTCView({ model: model })
        app.section(view, true)
    },

    createOrder: function(pair) {
        if (!app.authorize()) return;

        var split = pair.split('_');

        var book = this.allBooks.fromPair(split[0], split[1]);

        if (!book) {
            throw new Error('no book found for ' + split[0] + ' and ' + split[1]);
        }

        book.get('depth').fetch({
            url: app.api.url + '/public/books/' + book.id + '/depth?grouped=0'
        });

        var view = new Views.CreateOrderView({
            book: book
        });

        app.section(view, true);
    }
});

Backbone.$ = jQuery
