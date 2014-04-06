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
            , impersonate = mock.impersonate(app, uid)
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

    describe('remove', function() {
        it('removes the key', function(done) {
            var uid = dummy.number(1, 1e6)
            , kid = dummy.hex(64)
            , impersonate = mock.impersonate(app, uid)

            mock.once(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/^DELETE/)
                expect(query.text).to.match(/FROM api_key/)
                expect(query.text).to.match(/user_id = \$1/)
                expect(query.text).to.match(/api_key_id = \$2/)
                expect(query.values).to.eql([uid, kid])
                cb(null, mock.rows({}))
            })

            request(app)
            .del('/v1/keys/' + kid)
            .expect(204)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })
    })

    describe('creates', function() {
        it('succeeds', function(done) {
            var uid = dummy.number(1, 1e6)
            , req = {
                canTrade: dummy.bool(),
                canWithdraw: dummy.bool(),
                canDeposit: dummy.bool()
            }
            , res = {
                id: dummy.hex(64)
            }
            , impersonate = mock.impersonate(app, uid)

            mock.once(keys, 'generateApiKey', function() {
                return res.kid
            })

            mock.once(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/^INSERT INTO api_key/)
                expect(query.values).to.eql([
                    res.kid,
                    uid,
                    req.canTrade,
                    req.canDeposit,
                    req.canWithdraw
                ])
                cb(null, mock.rows({}))
            })

            request(app)
            .post('/v1/keys')
            .send(req)
            .expect(201)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })
    })

    // describe('replace', function() {
    //     it('replaces the key', function(done) {
    //         var uid = dummy.number(1, 1e6)
    //         , oldKid = dummy.hex(64)
    //         , newKid = dummy.hex(64)
    //         , impersonate = mock.impersonate(app, uid, { primary: true }, oldKid)

    //         mock.once(app.conn.write, 'query', function(query, cb) {
    //             expect(query.text).to.match(/replace_api_key/)
    //             expect(query.values).to.eql([oldKid, newKid])
    //             cb(null, mock.rows({}))
    //         })

    //         mock.once(app, 'activity', function(u, n, d) {
    //             expect(u).to.be(uid)
    //             expect(n).to.be('ChangePassword')
    //             expect(d).to.eql({})
    //         })

    //         request(app)
    //         .post('/v1/keys/replace')
    //         .send({
    //             key: newKid
    //         })
    //         .expect(204)
    //         .end(function(err) {
    //             impersonate.restore()
    //             done(err)
    //         })
    //     })
    // })

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
