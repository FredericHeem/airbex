var Backbone = require('backbone')
, expect = require('expect.js')
, BalancesView = require('../../views/BalancesView')

describe('BalancesView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var coll = new Backbone.Collection()
            var view = new BalancesView({
                collection: coll
            })
        })
    })
})
