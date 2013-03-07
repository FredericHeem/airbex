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
                expect(ri.securities['XRP'].scale).to.be(6)
                ri.client.end()
                done()
            })
            .done()
        })
    })
})
