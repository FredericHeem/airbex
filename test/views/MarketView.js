var Backbone = require('backbone')
, expect = require('expect.js')
, MarketView = require('../../views/MarketView')

describe('MarketView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var model = new Backbone.Model({
                depth: new Backbone.Collection()
            })

            var view = new MarketView({ model: model })
        })
    })
})
