var Backbone = require('backbone')
, Market = module.exports = Backbone.Model.extend({
    base: function() {
        return this.id.substr(0, 3)
    },

    quote: function() {
        return this.id.substr(3)
    }
})
