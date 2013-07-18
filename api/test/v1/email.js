/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')

describe('email', function() {
    describe('verifySend', function() {
        it('sends email', function(done) {
            var uid = dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, uid, { primary: true })
            , write = mock(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/create_email_verify_code/)
                expect(query.values[0]).to.eql(uid)
                cb(null, {
                    rows: [
                        {
                            email: 'test@test.com',
                            language: 'en-US'
                        }
                    ]
                })
            })
            , sendEmail = mock(app.email, 'send', function(u, lang, t, l, cb) {
                expect(u).to.eql('test@test.com')
                expect(lang).to.eql('en-US')
                cb()
            })

            request(app)
            .post('/v1/email/verify/send')
            .expect(204)
            .end(function(err) {
                sendEmail.restore()
                impersonate.restore()
                write.restore()
                done(err)
            })
        })
    })
})
