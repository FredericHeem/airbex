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
            , impersonate = mock.impersonate(app, { id: uid, securityLevel: 4 }, null, { canWithdraw: true })

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
            , impersonate = mock.impersonate(app, uid, null, { canWithdraw: false })

            request(app)
            .post('/v1/withdraws/bank')
            .expect(401)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })
    })

    describe('index', function() {
        it('returns withdraws', function(done) {
            var uid =  dummy.id()
            , impersonate = mock.impersonate(app, uid, null, { canWithdraw: true })
            , res = [{
                currency: 'BTC',
                amount: '987.12311111',
                id: dummy.id(),
                destination: dummy.bitcoinAddress(),
                created: +new Date(),
                completed: null,
                method: 'BTC',
                state: 'requested',
                error: null
            }]

            mock.once(app.conn.read, 'query', function(query, cb) {
                expect(query.text).to.match(/FROM withdraw_request_view/)
                expect(query.text).to.match(/user_id = \$1/)
                expect(query.values).to.eql([uid])
                cb(null, mock.rows({
                    request_id: res[0].id,
                    method: res[0].method,
                    bitcoin_address: res[0].destination,
                    created_at: res[0].created,
                    completed: res[0].completed,
                    state: res[0].state,
                    amount: 987.12311111e8,
                    currency_id: res[0].currency,
                    error: res[0].error
                }))
            })

            request(app)
            .get('/v1/withdraws')
            .expect(200)
            .expect(res)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })
    })

    describe('cancel', function() {
        it('succeeds', function(done) {
            var uid =  dummy.id()
            , id = dummy.id()
            , impersonate = mock.impersonate(app, uid, null, { canWithdraw: true })

            mock.once(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/cancel_withdraw_request/)
                expect(query.values).to.eql([id, uid])
                cb(null, mock.rows({}))
            })

            request(app)
            .del('/v1/withdraws/' + id)
            .expect(204)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })

        it('requires canWithdraw', function(done) {
            var uid =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, uid, null, { canWithdraw: false })

            request(app)
            .del('/v1/withdraws/123')
            .expect(401)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })
    })
})
