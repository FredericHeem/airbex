/* global describe, it, afterEach */
var expect = require('expect.js')
, mock = require('../mock')
, app = require('../..')
, tfa = app.security.tfa

describe('tfa', function() {
    describe('consume', function() {
        afterEach(function() {
            tfa.usedOtp = []
        })

        it('uses speakeasy', function() {
            var time = mock.once(tfa.speakeasy, 'time', function(opts) {
                expect(opts.key).to.be('xyz')
                expect(opts.encoding).to.be('base32')
                return '123456'
            })

            var correct = tfa.consume('xyz', '123456')
            expect(correct).to.be.ok()
            expect(time.invokes).to.be(1)
        })

        it('fails on wrong guess', function() {
            var time = mock.once(tfa.speakeasy, 'time', function(opts) {
                expect(opts.key).to.be('xyz')
                expect(opts.encoding).to.be('base32')
                return '654321'
            })

            var correct = tfa.consume('xyz', '123456')
            expect(correct).to.be(false)
            expect(time.invokes).to.be(1)
        })

        it('fails on wrong guess', function() {
            var time = mock(tfa.speakeasy, 'time', function(opts) {
                expect(opts.key).to.be('xyz')
                expect(opts.encoding).to.be('base32')
                return '654321'
            })

            var correct = tfa.consume('xyz', '123456')
            expect(correct).to.be(false)

            correct = tfa.consume('xyz', '999999')
            expect(correct).to.be(null)

            // correct guess, but locked out
            correct = tfa.consume('xyz', '123456')
            expect(correct).to.be(null)

            expect(time.invokes).to.be(3)
            time.restore()
        })
    })
})
