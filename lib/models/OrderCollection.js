var Backbone = require('backbone')
, Order = require('./Order')
, OrderCollection = module.exports = Backbone.Collection.extend({
    model: Order,

    url: '/api/private/orders'
});