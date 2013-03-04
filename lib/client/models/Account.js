var Relational = require('backbone-rel')
, Backbone = require('backbone')
, Security = require('./Security')
, num = require('num')
, Account = module.exports = Relational.RelationalModel.extend({
    idAttribute: 'account_id',

    availableDecimal: function() {
        return +num(this.get('available'), this.get('security').get('scale'));
    },

    relations: [{
        type: Relational.HasOne,
        key: 'security',
        keySource: 'security_id',
        keyDestination: 'security',
        relatedModel: Security
    }]
})
