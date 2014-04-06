/* global describe, it */
var expect = require('expect.js')
, request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, resetPassword = require('../../v1/resetPassword')
, dummy = require('../dummy')

describe('resetPassword', function() {
    describe('begin', function() {
        it('succeeds', function(done) {
            var emailCode
            , phoneCode
            , email = dummy.email()

            mock.once(resetPassword, 'createEmailCode', function() {
                emailCode = resetPassword.createEmailCode.real()
                return emailCode
            })

            mock.once(resetPassword, 'createPhoneCode', function() {
                phoneCode = resetPassword.createPhoneCode.real()
                return phoneCode
            })

            mock.once(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/reset_password_begin\(\$1, \$2, \$3\)/)
                expect(query.values).to.eql([
                    email.toLowerCase(),
                    emailCode,
                    phoneCode
                ])
                cb(null, {
                    rows: [
                        {
                            language: null
                        }
                    ]
                })
            })

            mock.once(app.smtp, 'sendMail', function(mail, cb) {
                expect(mail.subject).to.match(/password/i)
                expect(mail.to).to.eql(email)
                expect(mail.html).to.contain(emailCode)
                cb()
            })

            request(app)
            .post('/v1/resetPassword')
            .send({
                email: email
            })
            .expect(204)
            .end(function(err) {
                done(err)
            })
        })
    })

    describe('continue', function() {
        it('succeeds', function(done) {
            resetPassword.callDelay = 0

            var emailCode = dummy.hex(20)
            , phoneCode = dummy.fromAlphabet('0123456789', 4)

            mock.once(app.conn.write, 'query', function(query, cb) {
                expect(query.text).to.match(/reset_password_continue/)
                expect(query.values).to.eql([emailCode])
                cb(null, mock.rows({
                    code: phoneCode,
                    phone_number: '123456789'
                }))
            })

            mock.once(app.phone, 'text', function(number, msg, cb) {
                expect(number).to.be('123456789')
                expect(msg).to.contain(phoneCode.split('').join(', '))
                cb()
                done()
            })

            request(app)
            .get('/v1/resetPassword/continue/' + emailCode)
            .expect(200)
            .end(function(err) {
                if (err) return done(err)
            })
        })
    })
})
