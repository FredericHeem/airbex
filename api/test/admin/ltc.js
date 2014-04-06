/* global describe, it */
var request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')

describe('admin', function() {
    describe('ltc', function() {
        describe('height', function() {
            it('succeeds', function(done) {
                var impersonate = mock.impersonate(app, { id: dummy.id(), admin: true })
                , res = {
                    height: dummy.number(1, 1e6)
                }

                mock.once(app.conn.read, 'query', function(query, cb) {
                    cb(null, mock.rows({
                        litecoin_height: res.height
                    }))
                })

                request(app)
                .get('/admin/ltc/height')
                .expect(200)
                .expect(res)
                .end(function(err) {
                    if (err) return done(err)
                    impersonate.restore()
                    done()
                })
            })

            it('fails if not admin', function(done) {
                var impersonate = mock.impersonate(app, dummy.id())

                request(app)
                .get('/admin/ltc/height')
                .expect(401)
                .end(function(err) {
                    if (err) return done(err)
                    impersonate.restore()
                    done()
                })
            })

            it('fails if not logged in', function(done) {
                request(app)
                .get('/admin/ltc/height')
                .expect(401)
                .end(done)
            })
        })
    })
})
