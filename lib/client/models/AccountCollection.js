var Backbone = require('backbone')
, app = require('../app')
, Account = require('./Account')
, AccountCollection = module.exports = Backbone.Collection.extend({
    model: Account,
    url: app.api.url + '/private/accounts'
})
