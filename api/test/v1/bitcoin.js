/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')

describe('bitcoin', function() {
    describe('address', function() {
        it('returns address', function(done) {
            var uid = dummy.number(1, 1e6)
            , addr = dummy.bitcoinAddress()
            , impersonate = mock.impersonate(app, uid, null, { canDeposit: true })
            , read = mock(app.conn.read, 'query', function(query, cb) {
                expect(query.text).to.match(/FROM BTC_deposit_address/)
                expect(query.text).to.match(/= user_currency_acc/)
                expect(query.values).to.eql([uid, 'BTC'])
                cb(null, {
                    rows: [
                        {
                            address: addr
                        }
                    ]
                })
            })

            request(app)
            .get('/v1/BTC/address')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                address: addr
            })
            .end(function(err) {
                impersonate.restore()
                read.restore()
                done(err)
            })
        })
    })

    it('allows withdraw', function(done) {
        var uid = dummy.number(1, 1e6)
        , addr = dummy.bitcoinAddress()
        , impersonate = mock.impersonate(app, { id: uid, securityLevel: 4 }, null, { canWithdraw: true })
        , rid = dummy.number(1, 1e6)
        , write = mock(app.conn.write, 'query', function(query, cb) {
            expect(query.text).to.match(/BTC_withdraw\(\$1, \$2, \$3/)
            expect(query.values).to.eql([uid, addr, 10e8])
            cb(null, {
                rows: [
                    {
                        rid: rid
                    }
                ]
            })
        })

        mock(app, 'activity', function() {})

        request(app)
        .post('/v1/BTC/out')
        .send({
            amount: '10',
            address: addr
        })
        .expect(201)
        .expect('Content-Type', /json/)
        .expect({
            id: rid
        })
        .end(function(err) {
            app.activity.restore()
            impersonate.restore()
            write.restore()
            done(err)
        })
    })
})
