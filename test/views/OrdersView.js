var Backbone = require('backbone')
, expect = require('expect.js')
, OrdersView = require('../../views/OrdersView')

describe('OrdersView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var coll = new Backbone.Collection()
            var view = new OrdersView({ collection: coll })
        })
    })
})
