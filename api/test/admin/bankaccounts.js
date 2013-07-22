/* global describe, it */
var request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')

describe('admin', function() {
    describe('bankaccounts', function() {
        describe('index', function() {
            it('succeeds', function(done) {
                var impersonate = mock.impersonate(app, dummy.id(), { admin: true })

                mock.once(app.conn.read, 'query', function(query, cb) {
                    cb(null, mock.rows({}))
                })

                request(app)
                .get('/admin/bankaccounts')
                .expect(200)
                .expect([{}])
                .end(function(err) {
                    if (err) return done(err)
                    impersonate.restore()
                    done()
                })
            })

            it('fails if not admin', function(done) {
                var impersonate = mock.impersonate(app, dummy.id(), { admin: false })

                request(app)
                .get('/admin/bankaccounts')
                .expect(401)
                .end(function(err) {
                    if (err) return done(err)
                    impersonate.restore()
                    done()
                })
            })

            it('fails if not logged in', function(done) {
                request(app)
                .get('/admin/bankaccounts')
                .expect(401)
                .end(done)
            })
        })
    })
})
