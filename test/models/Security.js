var expect = require('expect.js')
, Security = require('../../models/Security')

describe('Security', function() {
    it('has idAttribute', function() {
        var target = new Security({ security_id: 123 })
        expect(target.id).to.be(123)
    })
})
