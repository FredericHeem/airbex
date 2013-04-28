var Backbone = require('backbone')
, Book = require('./Book')
, BookCollection = module.exports = Backbone.Collection.extend({
    model: Book,

    fromPair: function(base, quote) {
        return this.find(function(b) {
            return b.get('base_currency').id == base && b.get('quote_currency').id == quote;
        });
    }
});