var expect = require('expect.js')
, Currency = require('../../models/Currency')

describe('Currency', function() {
    it('has idAttribute', function() {
        var target = new Currency({ currency_id: 123 })
        expect(target.id).to.be(123)
    })
})
