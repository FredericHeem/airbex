var Backbone = require('backbone')
, Security = require('./Security')
, SecurityCollection = module.exports = Backbone.Collection.extend({
    model: Security
});