var Relational = require('backbone-rel')
, num = require('num')
, Depth = module.exports = Relational.RelationalModel.extend({
    idAttribute: 'price',

    priceDecimal: function() {
        if (!this.get('book')) throw new Error('book relation missing');

        return +num(this.get('price'), this.get('book').get('scale'));
    },

    volumeDecimal: function() {
        if (!this.get('book')) throw new Error('book relation missing');
        if (!this.get('book').get('base_security')) throw new Error('base_security of book missing');

        return +num(this.get('volume'), this.get('book').get('base_security').get('scale') - this.get('book').get('scale'));
    },

    toJSON: function() {
        var result = Relational.RelationalModel.prototype.toJSON.apply(this, arguments);
        result.priceDecimal = this.priceDecimal();
        result.volumeDecimal = this.volumeDecimal();
        return result;
    },

    url: function() {
        return '/api/public/books/' + this.get('book').pair.replace('/', '_') + '/depth?grouped=0';
    }
});