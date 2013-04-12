var Relational = require('backbone-rel')
, Backbone = require('backbone')
, Security = require('./Security')
, Depth = require('./Depth')
, DepthCollection = require('./DepthCollection')
, Order = require('./Order')
, OrderCollection = require('./OrderCollection')
, Book = module.exports = Relational.RelationalModel.extend({
    idAttribute: 'book_id',

    relations: [{
        type: Relational.HasMany,
        key: 'depth',
        relatedModel: Depth,
        collectionType: DepthCollection,
        includeInJSON: true,
        reverseRelation: {
            key: 'book',
            keySource: 'book_id'
        }
    }, {
        type: Relational.HasOne,
        key: 'base_security',
        keySource: 'base_security_id',
        relatedModel: Security
    }, {
        type: Relational.HasOne,
        key: 'quote_security',
        keySource: 'quote_security_id',
        relatedModel: Security
    }, {
        type: Relational.HasMany,
        key: 'orders',
        relatedModel: Order,
        collectionType: OrderCollection,
        reverseRelation: {
            key: 'book',
            keySource: 'book_id',
            includeInJSON: 'book_id'
        }
    }]
});