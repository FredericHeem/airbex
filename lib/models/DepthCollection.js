var Backbone = require('backbone')
, Depth = require('./Depth')
, DepthCollection = module.exports = Backbone.Collection.extend({
    model: Depth
});