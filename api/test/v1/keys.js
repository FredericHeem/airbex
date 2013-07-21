/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')
, keys = require('../../v1/keys')

describe('keys', function() {
    describe('index', function() {
        it('returns keys', function(done) {
            var uid = dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, uid, { primary: true })
            , res = [{
                id: 'A',
                canTrade: false,
                canDeposit: true,
                canWithdraw: true
            }]

            mock.once(app.conn.read, 'query', function(query, cb) {
                expect(query.text).to.match(/FROM api_key/)
                expect(query.text).to.match(/user_id = \$1/)
                expect(query.values).to.eql([uid])
                cb(null, {
                    rows: [
                        {
                            api_key_id: res[0].id,
                            can_trade: res[0].canTrade,
                            can_deposit: res[0].canDeposit,
                            can_withdraw: res[0].canWithdraw
                        }
                    ]
                })
            })

            request(app)
            .get('/v1/keys')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(res)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })
    })

    describe('generateApiKey', function() {
        it('has correct format', function() {
            var key = keys.generateApiKey()
            expect(key).to.match(/^[a-f0-9]{64}$/)
        })

        it('does not repeat', function() {
            var known = []

            for (var i = 0; i < 100; i++) {
                var key = keys.generateApiKey()
                expect(known).to.not.contain(key)
                known.push(key)
            }
        })
    })
})
