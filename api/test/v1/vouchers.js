/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')
, vouchers = require('../../v1/vouchers')

describe('vouchers', function() {
    describe('create', function() {
        it('returns voucher code', function(done) {
            var req = {
                amount: '1.234',
                currency: 'XRP'
            }
            , res = {
            }
            , userId = dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, { id: userId, securityLevel: 2 }, null,
                { canWithdraw: true })

            mock.once(vouchers, 'createId', function() {
                res.voucher = vouchers.createId.real()
                return res.voucher
            })

            mock.once(app.conn.write, 'query', function(q, cb) {
                expect(q.text).to.match(/create_voucher\(/)
                expect(q.values).to.eql([
                    res.voucher,
                    userId,
                    req.currency,
                    1.234e6
                ])
                cb()
            })

            mock.once(app, 'activity', function() {})

            request(app)
            .post('/v1/vouchers')
            .send(req)
            .expect(201)
            .expect('Content-Type', /json/)
            .expect(res)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })
    })

    describe('redeem', function() {
        it('redeems', function(done) {
            var userId = dummy.number(1, 1e6)
            , tid = dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, { id: userId, securityLevel: 2 }, null,
                { canDeposit: true })
            , voucher = dummy.hex(8).toUpperCase()
            , res = {
                currency: 'BTC',
                amount: '78.93200000'
            }

            mock.once(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/redeem_voucher\(\$1, \$2/)
                expect(query.values).to.eql([voucher, userId])
                cb(null, {
                    rowCount: 1,
                    rows: [
                        {
                            tid: tid
                        }
                    ]
                })
            })

            mock.once(app.conn.read, 'query', function(query, cb) {
                expect(query.values).to.eql([tid])
                cb(null, {
                    rows: [
                        {
                            currency_id: 'BTC',
                            amount: 78.932e8
                        }
                    ]
                })
            })

            request(app)
            .post('/v1/vouchers/' + voucher + '/redeem')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(res)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })
    })
})
