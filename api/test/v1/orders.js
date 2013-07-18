/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')

describe('orders', function() {
    describe('index', function() {
        it('returns orders', function(done) {
            var uid =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, uid)
            , read = mock(app.conn.read, 'query', function(query, cb) {
                expect(query.text).to.match(/FROM order_view/)
                expect(query.text).to.match(/user_id = \$/)
                expect(query.values).to.eql([uid])
                cb(null, {
                    rows: [
                        {
                            order_id: 5,
                            side: 1,
                            market: 'BTCXRP',
                            price: 123.456e3,
                            remaining: 0e5,
                            original: 10e5,
                            matched: 10e5,
                            cancelled: 0
                        }
                    ]
                })
            })

            request(app)
            .get('/v1/orders')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect([
                {
                    id: 5,
                    market: 'BTCXRP',
                    type: 'ask',
                    price: '123.456',
                    amount: '10.00000',
                    remaining: '0.00000',
                    matched: '10.00000',
                    cancelled: '0.00000'
                }
            ])
            .end(function(err) {
                impersonate.restore()
                read.restore()
                done(err)
            })
        })
    })

    describe('create', function() {
        it('creates order', function(done) {
            var uid =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, uid, { canTrade: true })
            , activity = mock(app, 'activity', function() {})
            , write = mock(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/INTO "order"/)
                expect(query.values).to.eql([uid, 'BTCLTC', 1, 550.7e3, 1.251e5])
                cb(null, {
                    rows: [
                        {
                            oid: 999
                        }
                    ]
                })
            })

            request(app)
            .post('/v1/orders')
            .send({
                price: '550.7',
                amount: '1.251',
                type: 'ask',
                market: 'BTCLTC'
            })
            .expect(201)
            .expect('Content-Type', /json/)
            .expect({
                id: 999
            })
            .end(function(err) {
                activity.restore()
                impersonate.restore()
                write.restore()
                done(err)
            })
        })
    })

    describe('cancel', function() {
        it('cancels order', function(done) {
            var uid =  dummy.number(1, 1e6)
            , oid =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, uid, { canTrade: true })
            , activity = mock(app, 'activity', function() {})
            , write = mock(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/UPDATE "order"/)
                expect(query.text).to.match(/volume = 0/)
                expect(query.text).to.match(/order_id = \$1/)
                expect(query.text).to.match(/user_id = \$2/)
                expect(query.values).to.eql([oid, uid])
                cb(null, {
                    rowCount: 1
                })
            })

            request(app)
            .del('/v1/orders/' + oid)
            .expect(204)
            .end(function(err) {
                activity.restore()
                impersonate.restore()
                write.restore()
                done(err)
            })
        })
    })
})
