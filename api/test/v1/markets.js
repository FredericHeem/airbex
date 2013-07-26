/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')

describe('markets', function() {
    describe('index', function() {
        it('returns markets', function(done) {
            var read = mock(app.conn.read, 'query', function(query, cb) {
                expect(query).to.match(/FROM market_summary/)
                cb(null, {
                    rows: [
                        {
                            base_currency_id: 'BTC',
                            quote_currency_id: 'NOK',
                            last: 550e3,
                            high: 600.5e3,
                            low: 525.123e3,
                            bid: 540e3,
                            ask: 570.5e3,
                            volume: 1234.56789e5
                        }
                    ]
                })
            })

            request(app)
            .get('/v1/markets')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect([
                {
                    id: 'BTCNOK',
                    last: '550.000',
                    high: '600.500',
                    low: '525.123',
                    bid: '540.000',
                    ask: '570.500',
                    volume: '1234.56789',
                    scale: 3
                }
            ])
            .end(function(err) {
                read.restore()
                done(err)
            })
        })
    })

    describe('depth', function() {
        it('returns depth', function(done) {
            var read = mock(app.conn.read, 'query', function(query, cb) {
                expect(query.text).to.match(/FROM order_depth_view/)
                expect(query.values).to.eql(['BTCLTC'])
                cb(null, {
                    rows: [
                        {
                            price: 550.5e3,
                            volume: 12345.12345,
                            type: 'bid'
                        },
                        {
                            price: 560.5e3,
                            volume: 32345.12345,
                            type: 'ask'
                        }
                    ]
                })
            })

            request(app)
            .get('/v1/markets/BTCLTC/depth')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                bids: [
                    ['550.500', '12345.12345']
                ],
                asks: [
                    ['560.500', '32345.12345']
                ]
            })
            .end(function(err) {
                read.restore()
                done(err)
            })
        })
    })
})
