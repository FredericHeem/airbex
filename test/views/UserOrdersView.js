var Backbone = require('backbone')
, expect = require('expect.js')
, UserOrdersView = require('../../views/UserOrdersView')

describe('UserOrdersView', function() {
    describe('constructor', function() {
        it('exists', function() {
            var coll = new Backbone.Collection()
            var view = new UserOrdersView({ collection: coll })
        })
    })
})
