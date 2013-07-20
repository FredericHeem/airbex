/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')
, bankaccounts = require('../../v1/bankaccounts')

describe('bankaccounts', function() {
    describe('index', function() {
        it('returns bankaccounts', function(done) {
            var userId =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, userId, { primary: true })
            , res = [
                {
                    id: dummy.number(1, 1e6),
                    displayName: null,
                    accountNumber: dummy.number(1e6, 1.9e6),
                    iban: null,
                    routingNumber: null,
                    verified: false,
                    verifying: true
                }
            ]

            var read = mock.once(app.conn.read, 'query', function(query, cb) {
                expect(query.text).to.match(/FROM bank_account/)
                expect(query.text).to.match(/user_id = \$/)
                expect(query.values).to.eql([userId])
                cb(null, {
                    rows: [
                        {
                            bank_account_id: res[0].id,
                            display_name: res[0].displayName,
                            account_number: res[0].accountNumber,
                            routing_number: res[0].routingNumber,
                            iban: res[0].iban,
                            verified_at: null,
                            verify_started_at: 'yes'
                        }
                    ]
                })
            })

            request(app)
            .get('/v1/bankaccounts')
            .expect(200)
            .expect('Content-Type', /json/)
            .expect(res)
            .end(function(err) {
                impersonate.restore()
                expect(read.invokes).to.be(1)
                done(err)
            })
        })
    })
})
