var Relational = require('backbone-relational')
, Backbone = require('backbone')
, num = require('num')
, AccountCollection = require('./AccountCollection')
, Account = require('./Account')
, User = module.exports = Relational.RelationalModel.extend({
    idAttribute: 'user_id',

    relations: [{
        type: Relational.HasMany,
        key: 'accounts',
        relatedModel: Account,
        collectionType: AccountCollection,
        includeInJSON: true,
        reverseRelation: {
            key: 'user',
            keySource: 'user_id'
        }
    }]
})
