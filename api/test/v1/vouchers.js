/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')
, vouchers = require('../../v1/vouchers')

describe('vouchers', function() {
    describe('withdraw', function() {
        it('returns voucher code', function(done) {
            var req = {
                amount: '1.234',
                currency: 'XRP'
            }
            , res = {
            }
            , userId = dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, userId, { canWithdraw: true })

            mock.once(vouchers, 'createId', function() {
                res.voucher = vouchers.createId.real()
                console.log(res)
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
})
