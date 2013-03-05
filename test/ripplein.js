var db = require('../lib/db')
, expect = require('expect.js')
, RippleIn = require('../lib/ripplein')

describe('RippleIn', function() {
    describe('cacheSecurities', function() {
        it('fetches all securities', function(done) {
            var ri = { client: db() }
            RippleIn.prototype.cacheSecurities.call(ri)
            .then(function() {
                expect(ri.securities['XRP']).to.be.ok()
                expect(ri.securities['XRP'].scale).to.be(8)
                ri.client.end()
                done()
            })
            .done()
        })
    })

    describe('parseAmount', function() {
        it('uses the scale', function() {
            var ri = { securities: { XRP: { scale: 8 }, BTC: { scale: 8 }, USD: { scale: 5 } } }
            , actual = RippleIn.prototype.parseAmount.call(ri, '1.97582', 'BTC')
            expect(actual).to.be(197582000)

            actual = RippleIn.prototype.parseAmount.call(ri, '0.00000001', 'XRP')
            expect(actual).to.be(1)

            actual = RippleIn.prototype.parseAmount.call(ri, '235.9', 'USD')
            expect(actual).to.be(23590000)
        })

        it('throws when precision is too high', function() {
            var ri = { securities: { USD: { scale: 5 } } }
            expect(function() {
                RippleIn.prototype.parseAmount.call(ri, '1.975823', 'USD')
            }).to.throwError(/precision/)
        })

        it('throws when the security is not known', function() {
            var ri = { securities: { USD: { scale: 5 } } }
            expect(function() {
                RippleIn.prototype.parseAmount.call(ri, '1.975823', 'GBP')
            }).to.throwError(/found/)
        })
    })
})
