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
                    routingNumber: null
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
                            iban: res[0].iban
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

        it('requires primary', function(done) {
            var userId =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, userId, { primary: false })

            request(app)
            .get('/v1/bankaccounts')
            .expect(401)
            .expect('Content-Type', /json/)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })
    })

    describe('add', function() {
        it('success', function(done) {
            var userId =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, userId, { primary: true, level: 4 })
            , req = {
                displayName: null,
                iban: null,
                accountNumber: dummy.number(1e6, 1.9e6).toString(),
                routingNumber: null,
                swiftbic: null
            }

            var write = mock.once(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/INSERT INTO bank_account/)
                expect(query.values).to.eql([
                    userId,
                    req.accountNumber,
                    req.iban,
                    req.swiftbic,
                    req.routingNumber
                ])
                cb()
            })

            request(app)
            .post('/v1/bankaccounts')
            .send(req)
            .expect(204)
            .end(function(err) {
                if (err) return done(err)
                impersonate.restore()
                expect(write.invokes).to.be(1)
                done()
            })
        })

        it('requires primary', function(done) {
            var userId =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, userId, { primary: false })

            request(app)
            .post('/v1/bankaccounts')
            .expect(401)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })

        it('validates', function(done) {
            var userId =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, userId, { primary: true, level: 4 })

            request(app)
            .post('/v1/bankaccounts')
            .send({
                iban: '!'
            })
            .expect(400)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })
    })
})
