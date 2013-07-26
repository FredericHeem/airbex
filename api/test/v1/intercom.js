/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')
, intercom = require('../../v1/intercom')

describe('intercom', function() {
    it('returns intercom settings', function(done) {
        var uid =  dummy.id()
        , impersonate = mock.impersonate(app, uid, { primary: true })
        , res = {
            app_id: app.config.intercom_app_id,
            user_id: uid,
            email: 'bob@job.com',
            user_hash: 'hash mocked',
            created_at: 'created at'
        }

        mock.once(app.conn.read, 'query', function(query, cb) {
            expect(query.text).to.match(/FROM "user"/)
            expect(query.text).to.match(/user_id = \$1/)
            expect(query.values).to.eql([uid])
            cb(null, {
                rows: [
                    {
                        user_id: res.user_id,
                        email_lower: res.email,
                        created_at: res.created_at
                    }
                ]
            })
        })

        mock.once(intercom, 'hash', function(a, u) {
            expect(a).to.be(app)
            expect(u).to.be(uid)
            return res.user_hash
        })

        request(app)
        .get('/v1/intercom')
        .expect(200)
        .expect('Content-Type', /json/)
        .expect(res)
        .end(function(err) {
            impersonate.restore()
            done(err)
        })
    })
})
