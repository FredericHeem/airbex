var Backbone = require('backbone')
, app = require('../app')
, Views = require('../views')
, BooksRouter = module.exports = Backbone.Router.extend({
    routes: {
        'books': 'books',
        'books/:book': 'book',
        'books/:book/new': 'createOrder'
    },

    books: function() {
        var view = new Views.BooksView({
            collection: app.cache.books
        })
        app.section(view, true);
    },

    book: function(pair) {
        var split = pair.split('_');

        var book = app.cache.books.fromPair(split[0], split[1]);

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

    createOrder: function(pair) {
        if (!app.authorize()) return;

        var split = pair.split('_');

        var book = app.cache.books.fromPair(split[0], split[1]);

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
})
