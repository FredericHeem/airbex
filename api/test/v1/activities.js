/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')

describe('activities', function() {
    describe('index', function() {
        it('returns activities', function(done) {
            var impersonate = mock.impersonate(app, 234)
            , read = mock(app.conn.read, 'query', function(query, cb) {
                expect(query.text).to.match(/FROM activity/)
                expect(query.text).to.match(/user_id =/)
                expect(query.values).to.eql([234])
                cb(null, {
                    rows: [
                        {
                            type: 'Credit',
                            details: JSON.stringify({
                                amount: '1250.50',
                                currency: 'NOK',
                                unexpected: true
                            })
                        },
                        {
                            type: 'Secret',
                            details: '{}'
                        }
                    ]
                })
            })

            request(app)
            .get('/v1/activities')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect([
                {
                    type: 'Credit',
                    details: {
                        currency: 'NOK',
                        amount: '1250.50'
                    }
                }
            ])
            .end(function(err) {
                impersonate.restore()
                read.restore()
                done(err)
            })
        })
    })
})
