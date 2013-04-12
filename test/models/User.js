var expect = require('expect.js')
, User = require('../../models/User')

describe('User', function() {
    it('has idAttribute', function() {
        var target = new User({ user_id: 123 })
        expect(target.id).to.be(123)
    })
})
