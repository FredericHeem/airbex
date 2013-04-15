var Relational = require('backbone-relational')
, Backbone = require('backbone')
, num = require('num')
, AccountCollection = require('./AccountCollection')
, Account = require('./Account')
, User = module.exports = Relational.RelationalModel.extend({
    idAttribute: 'user_id',

    validate: function(attrs, options) {
        if (!attrs.email.match(/^\S+@\S+$/)) return 'e-mail is invalid'
    },

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
