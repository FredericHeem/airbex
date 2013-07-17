/* global describe, it */
var request = require('supertest')
, expect = require('expect.js')

describe('email', function() {
    describe('verify', function() {
        it('should redirect to website root', function(done) {
            var app = require('../..')
            , code = '12345678901234567890'

            app.conn.write.query = function(query, cb) {
                expect(query.text).to.match(/verify_email/)
                expect(query.values).to.eql([code])
                cb()
            }

            request(app)
            .get('/v1/email/verify/' + code)
            .expect(302)
            .expect('Location', app.config.website_url)
            .end(done)
        })
    })
})
