var Relational = require('backbone-relational')
, Backbone = require('backbone')
, Currency = require('./Currency')
, num = require('num')
, Balance = module.exports = Relational.RelationalModel.extend({
    relations: [{
        type: Relational.HasOne,
        key: 'currency',
        keySource: 'id',
        keyDestination: 'currency',
        relatedModel: Currency
    }]
})
