var Backbone = require('backbone')
, User = module.exports = Backbone.Model.extend({
    validate: function(attrs, options) {
        if (!attrs.email.match(/^\S+@\S+$/)) return 'e-mail is invalid'
    }
})
