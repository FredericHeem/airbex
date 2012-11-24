var Relational = require('backbone-rel')
, Account = require('./Account')
, Transaction = module.exports = Relational.RelationalModel.extend({
    idAttribute: 'transaction_id',

    relations: [{
        type: Relational.HasOne,
        key: 'credit_account',
        relatedModel: Account,
        includeInJSON: false,
        keySource: 'credit_account_id'
    }, {
        type: Relational.HasOne,
        key: 'debit_account',
        relatedModel: Account,
        includeInJSON: false,
        keySource: 'credit_account_id'
    }],

    urlRoot: '/api/private/transactions'
})