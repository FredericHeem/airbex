var Backbone = require('backbone')
, expect = require('expect.js')
, MarketsView = require('../../views/MarketsView')

describe('MarketsView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var collection = new Backbone.Collection()
            var view = new MarketsView({ collection: collection })
        })
    })
})
