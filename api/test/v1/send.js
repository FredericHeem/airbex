/* global describe, it */
var expect = require('expect.js')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')
, send = require('../../v1/send')
, vouchers = require('../../v1/vouchers')

describe('send', function() {
    describe('sendToExistingUser', function() {
        it('success', function(done) {
            var userId =  dummy.number(1, 1e6)
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

    describe('sendVoucher', function() {
        it('success', function(done) {
            var userId =  dummy.number(1, 1e6)
            , to = dummy.email()
            , currency = 'BTC'
            , amount = '1.5'

            var createVoucher = mock.once(vouchers, 'create',
                function(app, from, currency, amount, cb)
            {
                expect(app).to.be(app)
                expect(from).to.be(userId)
                expect(currency).to.be(currency)
                expect(amount).to.be(amount)
                cb(null, 'voucher code')
            })

            var getSenderName = mock.once(send, 'getSenderName',
                function(app, from, cb)
            {
                expect(app).to.be(app)
                expect(from).to.be(userId)
                cb(null, 'full name')
            })

            var friendlyCurrency = mock.once(send, 'friendlyCurrency', function(n) {
                expect(n).to.be('BTC')
                return 'bitcoin'
            })

            var email = mock.once(app.email, 'send', function(to, lang, tn, opts, cb) {
                expect(to).to.be(to)
                expect(lang).to.be('en-US')
                expect(tn).to.be('voucher-invite')
                expect(opts.code).to.be('voucher code')
                expect(opts.currency).to.be('bitcoin')
                expect(opts.amount).to.be(amount)
                expect(opts.from).to.be('full name')
                cb()
            })

            var activity = mock.once(app, 'activity', function(user, name, details, cb) {
                expect(user).to.be(userId)
                expect(name).to.be('SendToUser')
                expect(details.to).to.be(to)
                expect(details.currency).to.be(currency)
                expect(details.amount).to.be(amount)
                cb && cb()
            })

            send.sendVoucher(app, userId, to, currency, amount, function(err) {
                if (err) return done(err)
                expect(createVoucher.invokes).to.be(1)
                expect(getSenderName.invokes).to.be(1)
                expect(email.invokes).to.be(1)
                expect(activity.invokes).to.be(1)
                done()
            })
        })
    })
})
