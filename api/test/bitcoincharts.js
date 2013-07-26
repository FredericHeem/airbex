/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('..')
, mock = require('./mock')

describe('bitcoincharts', function() {
    describe('trades', function() {
        it('returns trades', function(done) {
            var res = [
                {
                    price: '500.000',
                    date: 123,
                    volume: '1000.00000'
                }
            ]
            , read = mock.once(app.conn.read, 'query', function(query, cb) {
                expect(query.text).to.match(/FROM match_view/)
                expect(query.text).to.match(/m.base_currency_id = 'BTC'/)
                expect(query.values).to.eql(['NOK', 0])
                cb(null, mock.rows(res))
            })

            request(app)
            .get('/bitcoincharts/NOK/trades.json')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(res)
            .end(function(err) {
                if (err) return done(err)
                expect(read.invokes).to.be(1)
                done()
            })
        })
    })

    describe('orderbook', function() {
        it('returns book', function(done) {
            var res = {
                bids: [['500.123', '1750.99999']],
                asks: [['500.234', '1111.11111']]
            }
            , read = mock.once(app.conn.read, 'query', function(query, cb) {
                expect(query.text).to.match(/FROM order_depth_view/)
                expect(query.text).to.match(/m.base_currency_id = 'BTC'/)
                expect(query.values).to.eql(['NOK'])
                cb(null, mock.rows([
                    {
                        price_decimal: res.bids[0][0],
                        volume_decimal: res.bids[0][1],
                        type: 'bid'
                    },
                    {
                        price_decimal: res.asks[0][0],
                        volume_decimal: res.asks[0][1],
                        type: 'ask'
                    }
                ]))
            })

            request(app)
            .get('/bitcoincharts/NOK/orderbook.json')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(res)
            .end(function(err) {
                if (err) return done(err)
                expect(read.invokes).to.be(1)
                done()
            })
        })
    })
})
