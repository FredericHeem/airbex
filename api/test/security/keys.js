/* global describe, it */
var expect = require('expect.js')
, mock = require('../mock')
, app = require('../..')

describe('security', function() {
    describe('keys', function() {
        describe('handler', function() {
            it('looks up from api key', function(done) {
                var req = {
                    query: {
                        key: 'api key'
                    }
                }
                , res
                , user = {
                    id: 4321
                }

                var lookup = mock.once(app.security.keys, 'lookup', function(k, cb) {
                    expect(k).to.be(req.query.key)
                    cb(null, {
                        userId: user.id,
                        id: req.query.key
                    })
                })

                var fromUid = mock.once(app.security.users, 'fromUserId', function(uid, cb) {
                    expect(uid).to.be(user.id)
                    cb(null, user)
                })

                app.security.keys.handler(req, res, function(err) {
                    if (err) return done(err)
                    expect(req.user).to.be(user)
                    expect(lookup.invokes).to.be(1)
                    expect(fromUid.invokes).to.be(1)
                    done()
                })
            })
        })
    })
})
