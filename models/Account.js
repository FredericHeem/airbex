var Relational = require('backbone-relational')
, Backbone = require('backbone')
, Currency = require('./Currency')
, num = require('num')
, Account = module.exports = Relational.RelationalModel.extend({
    idAttribute: 'account_id',

    availableDecimal: function() {
        return +num(this.get('available'), this.get('currency').get('scale'));
    },

    relations: [{
        type: Relational.HasOne,
        key: 'currency',
        keySource: 'currency_id',
        keyDestination: 'currency',
        relatedModel: Currency
    }]
})
