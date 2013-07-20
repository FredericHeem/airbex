/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')
, send = require('../../v1/send')

describe('send', function() {
    describe('sendToExistingUser', function() {
        it('success', function(done) {
            var userId =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, userId, { primary: true })
            , to = dummy.email()
            , currency = 'BTC'

            mock.once(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/user_transfer_to_email/)
                expect(query.values).to.eql([
                    userId,
                    to,
                    currency,
                    1.5e8
                ])
                cb(null, mock.rows({
                    from_email: dummy.email(),
                    to_user_id: dummy.number()
                }))
            })

            var activity = mock(app, 'activity')

            send.sendToExistingUser(app, userId, to, currency, '1.5',
                function(err) {
                    if (err) return done(err)
                    expect(activity.invokes).to.be(2)
                    done()
                }
            )
        })
    })
})
