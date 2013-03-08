var expect = require('expect.js')
, Transaction = require('../../../lib/client/models/Transaction')

describe('Transaction', function() {
    it('has idAttribute', function() {
        var target = new Transaction({ transaction_id: 123 })
        expect(target.id).to.be(123)
    })
})
