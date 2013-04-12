var expect = require('expect.js')
, Account = require('../../models/Account')

describe('Account', function() {
    it('has idAttribute', function() {
        var target = new Account({ account_id: 123 })
        expect(target.id).to.be(123)
    })
})
