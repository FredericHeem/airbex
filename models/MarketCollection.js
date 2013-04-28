var Backbone = require('backbone')
, Market = require('./Market')
, MarketCollection = module.exports = Backbone.Collection.extend({
    model: Market,

    fromPair: function(base, quote) {
        return this.find(function(b) {
            return b.get('base_currency').id == base && b.get('quote_currency').id == quote;
        });
    }
});