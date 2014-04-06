/* global describe, it */
var request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')

describe('admin', function() {
    describe('balances', function() {
        describe('index', function() {
            it('succeeds', function(done) {
                var impersonate = mock.impersonate(app, { id: dummy.id(), admin: true })

                mock.once(app.conn.read, 'query', function(query, cb) {
                    cb(null, mock.rows({
                        balance: '1000000000',
                        currency: 'BTC',
                        type: 'current'
                    }))
                })


                request(app)
                .get('/admin/balances')
                .expect(200)
                .expect([
                    {
                        currency: 'BTC',
                        balance: '10.00000000',
                        type: 'current'

                    }
                ])
                .end(function(err) {
                    if (err) return done(err)
                    impersonate.restore()
                    done()
                })
            })

            it('fails if not admin', function(done) {
                var impersonate = mock.impersonate(app, dummy.id())

                request(app)
                .get('/admin/balances')
                .expect(401)
                .end(function(err) {
                    if (err) return done(err)
                    impersonate.restore()
                    done()
                })
            })

            it('fails if not logged in', function(done) {
                request(app)
                .get('/admin/balances')
                .expect(401)
                .end(done)
            })
        })
    })
})
