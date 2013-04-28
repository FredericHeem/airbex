var Backbone = require('backbone')
, Currency = require('./Currency')
, CurrencyCollection = module.exports = Backbone.Collection.extend({
    model: Currency
});