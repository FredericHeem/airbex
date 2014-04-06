/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')

describe('ripple', function() {
    describe('address', function() {
        it('returns address from config', function(done) {
            request(app)
            .get('/v1/ripple/address')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                address: app.config.ripple_account
            })
            .end(function(err) {
                done(err)
            })
        })
    })

    describe('withdraw', function() {
        it('success', function(done) {
            var req = {
                address: dummy.rippleAddress(),
                amount: '1.234',
                currency: 'BTC'
            }
            , res = {
                id: dummy.number(1, 1e6)
            }
            , userId = dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, { id: userId, securityLevel: 2}, null,
                { canWithdraw: true })

            mock.once(app.conn.write, 'query', function(q, cb) {
                expect(q.text).to.match(/ripple_withdraw\(/)
                expect(q.values).to.eql([
                    userId,
                    req.currency,
                    req.address,
                    1.234e8
                ])
                cb(null, {
                    rows: [
                        {
                            rid: res.id
                        }
                    ]
                })
            })

            mock.once(app, 'activity', function() {})

            request(app)
            .post('/v1/ripple/out')
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
