/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')

describe('spend', function() {
    describe('spend', function() {
        it('spends', function(done) {
            var uid =  dummy.number(1, 1e6)
            , oid = dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, uid, null, { canTrade: true })

            mock.once(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/convert_bid/)
                expect(query.values).to.eql([
                    uid,
                    (1.251e5).toString(),
                    'BTCNOK'
                ])
                cb(null, {
                    rowCount: 1,
                    rows: [
                        {
                            oid: oid
                        }
                    ]
                })
            })

            request(app)
            .post('/v1/spend')
            .send({
                amount: '1.251',
                market: 'BTCNOK'
            })
            .expect(201)
            .expect('Content-Type', /json/)
            .expect({
                id: oid
            })
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })
    })
})
