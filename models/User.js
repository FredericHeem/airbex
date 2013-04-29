var Relational = require('backbone-relational')
, Backbone = require('backbone')
, User = module.exports = Relational.RelationalModel.extend({
    idAttribute: 'user_id',

    validate: function(attrs, options) {
        if (!attrs.email.match(/^\S+@\S+$/)) return 'e-mail is invalid'
    }
})
