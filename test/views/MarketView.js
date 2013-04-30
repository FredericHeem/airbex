var Backbone = require('backbone')
, expect = require('expect.js')
, MarketView = require('../../views/MarketView')

describe('MarketView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var view = new MarketView({
                collection: new Backbone.Collection()
            })
        })
    })
})
