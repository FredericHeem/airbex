var expect = require('expect.js')
, Order = require('../../../lib/client/models/Order')

describe('Order', function() {
    it('has idAttribute', function() {
        var target = new Order({ order_id: 123 })
        expect(target.id).to.be(123)
    })
})
