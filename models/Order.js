var Relational = require('backbone-relational')
, num = require('num')
, Order = module.exports = Relational.RelationalModel.extend({
    idAttribute: 'order_id',

    priceDecimal: function() {
        if (!this.get('book')) throw new Error('book relation missing');

        return +num(this.get('price'), this.get('book').get('scale'));
    },

    volumeDecimal: function() {
        return +num(this.get('volume'), this.get('book').get('base_security').get('scale') - this.get('book').get('scale'));
    },

    originalDecimal: function() {
        return +num(this.get('original'), this.get('book').get('base_security').get('scale') - this.get('book').get('scale'));
    },

    cancelledDecimal: function() {
        return +num(this.get('cancelled'), this.get('book').get('base_security').get('scale') - this.get('book').get('scale'));
    },

    matchedDecimal: function() {
        return +num(this.get('matched'), this.get('book').get('base_security').get('scale') - this.get('book').get('scale'));
    }
})
