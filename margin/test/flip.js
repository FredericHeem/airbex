/* global describe, it */
var expect = require('expect.js')
, Flip = require('../flip')

describe('Flip', function() {
    describe('depth', function() {
        it('flips', function(done) {
            var inner = {
                depth: function(market, cb) {
                    expect(market).to.be('USDBTC')
                    cb(null, {
                        bids: [
                            {
                                price: '12.28000',
                                volume: '120.00000'
                            }
                        ],
                        asks: [
                            {
                                price: '15.30000',
                                volume: '37.00000'
                            }
                        ]
                    })
                }
            }

            var flip = new Flip(inner)
            flip.depth('BTCUSD', function(err, depth) {
                expect(depth.bids.length).to.be(1)
                var bid = depth.bids[0]
                expect(bid.price).to.be('0.06535')
                expect(bid.volume).to.be('566.10000')

                var ask = depth.asks[0]
                expect(ask.price).to.be('0.08143')
                expect(ask.volume).to.be('1473.60000')

                done()
            })
        })
    })
})
