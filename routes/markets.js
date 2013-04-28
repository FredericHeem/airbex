var Backbone = require('backbone')
, app = require('../app')
, Views = require('../views')
, MarketsRouter = module.exports = Backbone.Router.extend({
    routes: {
        'markets': 'markets',
        'markets/:market': 'market',
        'markets/:market/new': 'createOrder'
    },

    markets: function() {
        var view = new Views.MarketsView({
            collection: app.cache.markets
        })
        app.section(view, true);
    },

    market: function(pair) {
        var split = pair.split('_');

        var market = app.cache.markets.fromPair(split[0], split[1]);

        if (!market) {
            throw new Error('no market found for ' + split[0] + ' and ' + split[1]);
        }

        market.get('depth').fetch({
            url: app.apiUrl + '/markets/' + market.id + '/depth?grouped=0'
        });

        var view = new Views.MarketView({
            model: market
         });

        app.section(view, true);
    },

    createOrder: function(pair) {
        if (!app.authorize()) return;

        var split = pair.split('_');

        var market = app.cache.markets.fromPair(split[0], split[1]);

        if (!market) {
            throw new Error('no market found for ' + split[0] + ' and ' + split[1]);
        }

        market.get('depth').fetch({
            url: app.apiUrl + '/markets/' + market.id + '/depth?grouped=0'
        });

        var view = new Views.CreateOrderView({
            market: market
        });

        app.section(view, true);
    }
})
