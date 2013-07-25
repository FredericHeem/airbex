/* global describe, it */
var expect = require('expect.js')
, request = require('request')
, app = require('..')
, mock = require('./mock')

describe('verifyEmail', function() {
    it('uses block-disposable-email', function(done) {
        app.config.bde_api_key = 'key'

        var get = mock.once(request, 'get', function(opts, cb) {
            expect(opts.url).to.be('http://check.block-disposable-email.com/easyapi/json/key/rob.com')
            expect(opts.json).to.be(true)
            cb(null, { statusCode: 200 }, { domain_status: 'ok' })
        })

        app.verifyEmail('bob@rob.com', function(err, res) {
            if (err) return done(err)
            expect(get.invokes).to.be(1)
            expect(res).to.be(true)
            done()
        })
    })
})
