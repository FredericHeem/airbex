var Backbone = require('backbone')
, Order = require('./Order')
, app = require('../app')
, OrderCollection = module.exports = Backbone.Collection.extend({
    model: Order,

    url: app.api.url + '/private/orders'
})
