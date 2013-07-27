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
})
