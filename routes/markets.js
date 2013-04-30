var Backbone = require('backbone')
, app = require('../app')
, MarketsView = require('../views/MarketsView')
, MarketView = require('../views/MarketView')
, Market = require('../models/Market')
, CreateOrderView = require('../views/CreateOrderView')
, MarketsRouter = module.exports = Backbone.Router.extend({
    routes: {
        'markets': 'markets',
        'markets/:market': 'market',
        'markets/:market/new': 'createOrder'
    },

    markets: function() {
        var view = new MarketsView({
            collection: app.cache.markets
        })
        app.section(view, true);
    },

    market: function(id) {
        var depth = new Backbone.Collection()
        , market = app.cache.markets.get(id)
        , view = new MarketView({
            model: market,
            collection: depth
         })

        depth.fetch({
            url: app.apiUrl + '/markets/' + id + '/depth'
        }, { reset: true })

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
            url: app.apiUrl + '/markets/' + market.id + '/depth'
        });

        var view = new CreateOrderView({
            market: market
        });

        app.section(view, true);
    }
})
