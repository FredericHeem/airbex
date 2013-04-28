var Relational = require('backbone-relational')
, Backbone = require('backbone')
, Currency = require('./Currency')
, Depth = require('./Depth')
, DepthCollection = require('./DepthCollection')
, Order = require('./Order')
, OrderCollection = require('./OrderCollection')
, Market = module.exports = Relational.RelationalModel.extend({
    idAttribute: 'market_id',

    pair: function() {
        return this.get('base_currency').id + '/' + this.get('quote_currency').id
    },

    relations: [{
        type: Relational.HasMany,
        key: 'depth',
        relatedModel: Depth,
        collectionType: DepthCollection,
        includeInJSON: true,
        reverseRelation: {
            key: 'market',
            keySource: 'market_id'
        }
    }, {
        type: Relational.HasOne,
        key: 'base_currency',
        keySource: 'base_currency_id',
        relatedModel: Currency
    }, {
        type: Relational.HasOne,
        key: 'quote_currency',
        keySource: 'quote_currency_id',
        relatedModel: Currency
    }, {
        type: Relational.HasMany,
        key: 'orders',
        relatedModel: Order,
        collectionType: OrderCollection,
        reverseRelation: {
            key: 'market',
            keySource: 'market_id',
            includeInJSON: 'market_id'
        }
    }]
});