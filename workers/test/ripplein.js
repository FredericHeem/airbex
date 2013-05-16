var expect = require('expect.js')
, RippleIn = require('../lib/ripplein')

describe('RippleIn', function() {
    describe('cacheCurrencies', function() {
        it('fetches all currencies', function(done) {
            var ri = {
                client: {
                    query: function(text, cb) {
                        expect(text).to.match(/from "currency/i)
                        cb(null, { rows: [{ currency_id: 'XRP', scale: 6 }] })
                    }
                }
            }

            RippleIn.prototype.cacheCurrencies.call(ri)
            .then(function() {
                expect(ri.currencies['XRP']).to.be.ok()
                expect(ri.currencies['XRP'].scale).to.be(6)
                done()
            })
            .done()
        })
    })
})
