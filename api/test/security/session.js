/* global describe, it */
var expect = require('expect.js')
, app = require('../..')
, mock = require('../mock')
, request = require('supertest')

describe('security', function() {
    describe('session', function() {
        describe('randomSha256', function() {
            it('has expected format', function() {
                var hash = app.security.session.randomSha256()
                expect(hash).to.match(/^[a-f0-9]{64}$/)
            })

            it('does not repeat', function() {
                var known = []
                for (var i = 0; i < 100; i++) {
                    var hash = app.security.session.randomSha256()
                    expect(!!~known.indexOf(hash)).to.be(false)
                    known.push(hash)
                }
            })
        })

        describe('extend', function() {
            it('succeeds on valid session', function(done) {
                var sid = app.security.session.randomSha256()
                app.security.session.sessions = {}
                app.security.session.sessions[sid] = {
                    expires: +new Date() + 10e3
                }
                app.security.session.extend(sid, done)
            })

            it('fails on expired session', function(done) {
                var sid = app.security.session.randomSha256()

                app.security.session.sessions[sid] = {
                    expires: +new Date() - 10e3
                }

                app.security.session.extend(sid, function(err) {
                    expect(err.message).to.match(/not found/i)
                    done()
                })
            })

            it('fails on non-existant session', function(done) {
                var sid = app.security.session.randomSha256()

                app.security.session.extend(sid, function(err) {
                    expect(err.message).to.match(/not found/i)
                    done()
                })
            })
        })

        describe('create', function() {
            it('suceeds when user is not found', function(done) {
                mock.once(app.conn.read, 'query', function(query, cb) {
                    expect(query.values).to.eql(['a@a.a'])
                    cb(null, mock.rows())
                })

                mock.once(app.security.session, 'randomSha256', function() {
                    return 'sha'
                })

                request(app)
                .post('/security/session')
                .send({ email: 'A@a.a'})
                .expect(201)
                .expect({ id: 'sha' })
                .end(function(err) {
                    if (err) return done(err)
                    done()
                })
            })

            it('suceeds when user is found', function(done) {
                mock.once(app.conn.read, 'query', function(query, cb) {
                    expect(query.values).to.eql(['a@a.a'])
                    cb(null, mock.rows({
                        user_id: 123,
                        admin: false,
                        two_factor: 'tfa',
                        suspended: false,
                        primary_api_key_id: 'upk'
                    }))
                })

                mock.once(app.security.session, 'randomSha256', function() {
                    return 'sha'
                })

                mock.once(app.security.session, 'getSessionKey', function() {
                    return 'key'
                })

                request(app)
                .post('/security/session')
                .send({ email: 'a@a.a'})
                .expect(201)
                .expect({ id: 'sha' })
                .end(function(err) {
                    if (err) return done(err)
                    var session = app.security.session.sessions['key']
                    expect(session.id).to.be('sha')
                    expect(session.userId).to.be(123)
                    done()
                })
            })
        })

        describe('remove', function() {
            it('removes the session', function(done) {
                mock.once(app.security.session, 'lookup', function(id, cb) {
                    expect(id).to.be('foo')
                    cb(null, { id: 'session', userId: 500 })
                })

                mock.once(app.security.users, 'fromUserId', function(id, cb) {
                    expect(id).to.be(500)
                    cb(null, { id: 600 })
                })

                request(app)
                .del('/security/session')
                .set('Cookie', 'session=foo')
                .expect(204)
                .end(function(err) {
                    if (err) return done(err)
                    var session = app.security.session.sessions['foo']
                    expect(session).to.not.be.ok()
                    done()
                })
            })
        })
    })
})
