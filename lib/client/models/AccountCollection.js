var Backbone = require('backbone')
, Account = require('./Account')
, AccountCollection = module.exports = Backbone.Collection.extend({
    model: Account
})
