/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')

describe('ripple', function() {
    describe('trust', function() {
        it('returns lines', function(done) {
            var account = dummy.rippleAddress()
            mock.once(app.ripple.drop, 'lines', function(a, cb) {
                expect(a).to.be(account)
                cb(null, [
                    {
                        account: app.config.ripple_account,
                        currency: 'NOK',
                        limit: 1,
                        balance: 0
                    }
                ])
            })

            request(app)
            .get('/v1/ripple/trust/' + account)
            .expect(200)
            .expect('Content-Type', /json/)
            .expect({
                NOK: { limit: 1, balance: 0 }
            })
            .end(function(err) {
                done(err)
            })
        })
    })
})
