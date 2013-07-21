/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')

describe('withdraws', function() {
    describe('withdrawBank', function() {
        it('succeeds', function(done) {
            var uid =  dummy.number(1, 1e6)
            , baid = dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, uid, { canWithdraw: true })

            mock.once(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/withdraw_bank/)
                expect(query.values).to.eql([
                    uid,
                    baid,
                    'NOK',
                    (1.25e5).toString()
                ])
                cb(null, mock.rows({}))
            })

            request(app)
            .post('/v1/withdraws/bank')
            .send({
                bankAccount: baid,
                amount: '1.25',
                currency: 'NOK'
            })
            .expect(204)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })

        it('requires canWithdraw', function(done) {
            var uid =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, uid, { canWithdraw: false })

            request(app)
            .post('/v1/withdraws/bank')
            .expect(401)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })
    })
})
