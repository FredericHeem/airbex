var async = require('async')
, Models = require('./models')
, app = require('./app')
, cache = module.exports = {
    securities: null,
    books: null,

    reload: function(cb) {
        var that = this
        this.securities = new Models.SecurityCollection()
        this.books = new Models.BookCollection()

        async.parallel([
            function(next) {
                that.securities.fetch({
                    url: app.api.url + '/public/securities',
                    success: function() { next(); },
                    error: function(e) { next(e); }
                });
            },
            function(next) {
                that.books.fetch({
                    url: app.api.url + '/public/books',
                    success: function() { next(); },
                    error: function(e) { next(e); }
                });
            },
            function(next) {
                $.ajax(app.api.url + '/ripple/address')
                .then(function(account) {
                    app.rippleAddress = account.address
                    next()
                })
            }
        ], cb)
    }
}
