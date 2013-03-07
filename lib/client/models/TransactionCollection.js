var Backbone = require('backbone')
, app = require('../app')
, Transaction = require('./Transaction')
, TransactionCollection = module.exports = Backbone.Collection.extend({
    model: Transaction
})
