var Relational = require('backbone-rel')
, Backbone = require('backbone')
, Security = require('./Security')
, Transaction = require('./Transaction')
, num = require('num')
, TransactionCollection = require('./TransactionCollection')
, Account = module.exports = Relational.RelationalModel.extend({
    idAttribute: 'account_id',

    availableDecimal: function() {
        return +num(this.get('available'), this.get('security').get('scale'));
    },

    relations: [{
        type: Relational.HasMany,
        key: 'transactions',
        relatedModel: Transaction,
        collectionType: TransactionCollection,
        includeInJSON: true,
        reverseRelation: {
            key: 'book'
        }
    }, {
        type: Relational.HasOne,
        key: 'security',
        includeInJSON: true,
        keySource: 'security_id',
        keyDestination: 'security',
        relatedModel: Security
    }]
});