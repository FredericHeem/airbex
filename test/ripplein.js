var expect = require('expect.js')
, RippleIn = require('../lib/ripplein')

describe('RippleIn', function() {
    describe('cacheSecurities', function() {
        it('fetches all securities', function(done) {
            var ri = {
                client: {
                    query: function(text, cb) {
                        expect(text).to.match(/from "security/i)
                        cb(null, { rows: [{ security_id: 'XRP', scale: 6 }] })
                    }
                }
            }

            RippleIn.prototype.cacheSecurities.call(ri)
            .then(function() {
                expect(ri.securities['XRP']).to.be.ok()
                expect(ri.securities['XRP'].scale).to.be(6)
                done()
            })
            .done()
        })
    })
})
