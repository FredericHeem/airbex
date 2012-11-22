var Backbone = require('backbone')
_ = require('underscore')
, Models = require('../models')
, Views = require('./views')
, async = require('async')
, templates = require('./templates')
, app = require('./app')
, Router = module.exports = Backbone.Router.extend({
    initialize: function() {
        templates.read();

        this.allSecurities = new Models.SecurityCollection();
        this.allBooks = new Models.BookCollection();

        async.series([
            _.bind(function(next) {
                this.allSecurities.fetch({
                    success: function() { next(); },
                    error: function(e) { next(e); }
                });
            }, this),
            _.bind(function(next) {
                this.allBooks.fetch({
                    success: function() { next(); },
                    error: function(e) { next(e); }
                });
            }, this)
        ], _.bind(function() {
            console.log('starting history');
            Backbone.history.start();
        }, this));

        app.session = new Models.Session();
        console.log('app from init', this);

        app.header = new Views.HeaderView();
        app.header.render();

        this.route(/^login(?:\?after=(.+))?/, 'login');

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
        console.log('*** home route not implemented')
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
        });

        var view = new Views.UserAccountsView({ collection: collection });
        app.section(view, true);
    },

    userOrders: function() {
        console.log('route: user orders');

        if (!app.authorize()) return;

        var collection = new Models.OrderCollection();
        collection.fetch({
            url: '/api/private/orders'
        });

        var view = new Views.UserOrdersView({ collection: collection });
        app.section(view, true);
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
            url: '/api/public/books/' + book.id + '/depth?grouped=0'
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

    depositBTC: function() {
        if (!app.authorize()) return
        var view = new Views.DepositBTCView()
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
            url: '/api/public/books/' + book.id + '/depth?grouped=0'
        });

        var view = new Views.CreateOrderView({
            book: book
        });

        app.section(view, true);
    }
});

Backbone.setDomLibrary(jQuery);