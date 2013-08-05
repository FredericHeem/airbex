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
                            type: 'ask',
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
            , impersonate = mock.impersonate(app, uid, { canTrade: true, level: 2 })
            , activity = mock(app, 'activity', function() {})
            , write = mock(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/INTO "order"/)
                expect(query.values).to.eql([uid, 'BTCLTC', 'ask', 550.7e3, 1.251e5])
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

        it('returns 404 if order is not found', function(done) {
            var uid =  dummy.number(1, 1e6)
            , oid =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, uid, { canTrade: true })

            mock.once(app.conn.write, 'query', function(query, cb) {
                cb(null, mock.rows([]))
            })

            request(app)
            .del('/v1/orders/' + oid)
            .expect(404)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })
    })

    describe('history', function() {
        it('returns order history', function(done) {
            var uid =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, uid)
            , res = [{
                id: dummy.id(),
                market: 'BTCLTC',
                type: 'ask',
                price: '44.900',
                amount: '0.55550',
                remaining: '0.45550',
                matched: '0.10000',
                cancelled: '0.00000',
                averagePrice: '44.900'
            }, {
                id: dummy.id(),
                market: 'BTCNOK',
                type: 'bid',
                price: '500.900',
                amount: '0.33333',
                remaining: '0.45550',
                matched: '0.10000',
                cancelled: '0.00000',
                averagePrice: '500.900'
            }]
            , read = mock(app.conn.read, 'query', function(query, cb) {
                expect(query.text).to.match(/FROM order_history/)
                expect(query.text).to.match(/user_id = \$/)
                expect(query.values).to.eql([uid])
                cb(null, mock.rows([{
                    order_id: res[0].id,
                    market: res[0].market,
                    type: res[0].type,
                    volume: res[0].remaining * 1e5,
                    matched: res[0].matched * 1e5,
                    cancelled: res[0].cancelled * 1e5,
                    original: res[0].amount * 1e5,
                    price: res[0].price * 1e3,
                    average_price: res[0].price * 1e3
                }, {
                    order_id: res[1].id,
                    market: res[1].market,
                    type: res[1].type,
                    volume: res[1].remaining * 1e5,
                    matched: res[1].matched * 1e5,
                    cancelled: res[1].cancelled * 1e5,
                    original: res[1].amount * 1e5,
                    price: res[1].price * 1e3,
                    average_price: res[1].price * 1e3
                }]))
            })

            request(app)
            .get('/v1/orders/history')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(res)
            .end(function(err) {
                impersonate.restore()
                read.restore()
                done(err)
            })
        })
    })
})
