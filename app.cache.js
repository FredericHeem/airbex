var async = require('async')
, Models = require('./models')
, app = require('./app')
, cache = module.exports = {
    currencies: null,
    markets: null,

    reload: function(cb) {
        var that = this
        this.currencies = new Models.CurrencyCollection()
        this.markets = new Models.MarketCollection()

        async.parallel([
            function(next) {
                that.currencies.fetch({
                    url: app.apiUrl + '/currencies',
                    success: function() { next(); },
                    error: function(e) { next(e); }
                });
            },
            function(next) {
                that.markets.fetch({
                    url: app.apiUrl + '/markets',
                    success: function() { next(); },
                    error: function(e) { next(e); }
                });
            },
            function(next) {
                $.ajax(app.apiUrl + '/ripple/address')
                .then(function(account) {
                    app.rippleAddress = account.address
                    next()
                })
            }
        ], cb)
    }
}
