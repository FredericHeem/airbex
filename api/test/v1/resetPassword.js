var expect = require('expect.js')
, resetPassword = require('../../v1/resetPassword')

describe('resetPassword', function() {
    describe('createPhoneCode', function() {
        it('always has four digits', function() {
            for (var i = 0; i < 1000; i++) {
                var s = resetPassword.createPhoneCode()
                expect(s.length).to.be(4)
            }
        })
    })

    describe('createEmailCode', function() {
        it('always has 20 digits', function() {
            for (var i = 0; i < 1000; i++) {
                var s = resetPassword.createEmailCode()
                expect(s.length).to.be(20)
            }
        })
    })
})
