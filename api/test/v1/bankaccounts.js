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
            , impersonate = mock.impersonate(app, userId, { primary: true })
            , req = {
                displayName: null,
                iban: null,
                accountNumber: dummy.number(1e6, 1.9e6).toString(),
                routingNumber: null,
                swiftbic: null,
                verified: false,
                verifying: true
            }

            mock.once(bankaccounts, 'createVerifyCode', function() {
                return 'code mocked'
            })

            var write = mock.once(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/INSERT INTO bank_account/)
                expect(query.values).to.eql([
                    userId,
                    req.accountNumber,
                    req.iban,
                    req.swiftbic,
                    req.routingNumber,
                    'code mocked'
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
    })

    describe('verify', function() {
        it('success', function(done) {
            var userId =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, userId, { primary: true })
            , req = {
                code: dummy.hex(4)
            }
            , id = dummy.number(1, 1e6)

            mock.once(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/verify_bank_account/)
                expect(query.values).to.eql([
                    userId,
                    id,
                    req.code
                ])
                cb(null, {
                    rows: [
                        {
                            account_number: '1234',
                            iban: null,
                            success: true
                        }
                    ]
                })
            })

            var log = mock.once(app, 'activity')

            request(app)
            .post('/v1/bankaccounts/' + id + '/verify')
            .send(req)
            .expect(204)
            .end(function(err) {
                if (err) return done(err)
                impersonate.restore()
                expect(log.invokes).to.be(1)
                done()
            })
        })

        it('returns error on wrong code', function(done) {
            var userId =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, userId, { primary: true })

            mock.once(app.conn.write, 'query', function(query, cb) {
                cb(null, mock.rows({
                    account_number: null,
                    iban: null,
                    success: false
                }))
            })

            request(app)
            .post('/v1/bankaccounts/123/verify')
            .send({ code: 'ABCDE'})
            .expect(400)
            .expect({
                name: 'WrongBankAccountVerifyCode'
            })
            .end(function(err) {
                if (err) return done(err)
                impersonate.restore()
                done()
            })
        })

        it('returns error when account is not found', function(done) {
            var userId =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, userId, { primary: true })

            mock.once(app.conn.write, 'query', function(query, cb) {
                cb(null, mock.rows())
            })

            request(app)
            .post('/v1/bankaccounts/123/verify')
            .send({ code: 'ABCDE'})
            .expect(400)
            .expect({
                name: 'BankAccountNotFound'
            })
            .end(function(err) {
                if (err) return done(err)
                impersonate.restore()
                done()
            })
        })

        it('requires primary', function(done) {
            var userId =  dummy.number(1, 1e6)
            , impersonate = mock.impersonate(app, userId, { primary: false })

            request(app)
            .post('/v1/bankaccounts/123/verify')
            .expect(401)
            .end(function(err) {
                impersonate.restore()
                done(err)
            })
        })
    })

    describe('createVerifyCode', function() {
        it('is four characters', function() {
            var code = bankaccounts.createVerifyCode()
            expect(code).to.match(/^[A-Z0-9]{4}$/)
        })

        it('does not repeat', function() {
            var code1 = bankaccounts.createVerifyCode()
            , code2 = bankaccounts.createVerifyCode()
            expect(code1).to.not.be(code2)
        })
    })
})
