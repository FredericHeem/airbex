var Backbone = require('backbone')
, Transaction = require('./Transaction')
, TransactionCollection = module.exports = Backbone.Collection.extend({
    model: Transaction,
    url: '/api/private/transactions'
})