/* global describe, it */
var request = require('supertest')
, app = require('../..')
, mock = require('../mock')
, dummy = require('../dummy')
, expect = require('expect.js')

describe('admin', function() {
    describe('credit', function() {
        describe('bankCredit', function() {
            it('succeeds', function(done) {
                var uid = dummy.id()
                , impersonate = mock.impersonate(app, { id: uid, admin: true })
                , req = {
                    user_id: dummy.id(),
                    currency_id: 'NOK',
                    amount: '100.50',
                    reference: 'test'
                }
                , res = {
                    transaction_id: dummy.id()
                }

                mock.once(app.conn.write, 'query', function(query, cb) {
                    expect(query.text).to.match(/bank_credit/)
                    expect(query.values).to.eql([
                        req.user_id,
                        req.currency_id,
                        100.50e5,
                        req.reference
                    ])

                    cb(null, mock.rows({
                        tid: res.transaction_id
                    }))
                })

                var adminActivity
                , userActivity

                var activity = mock(app, 'activity', function(u, t, d) {
                    if (u == uid) {
                        expect(t).to.eql('AdminBankAccountCredit')
                        expect(d).to.eql(req)
                        adminActivity = true
                    } else {
                        expect(u).to.eql(req.user_id)
                        expect(t).to.eql('BankCredit')
                        expect(d).to.eql({
                            currency: req.currency_id,
                            amount: req.amount,
                            reference: req.reference
                        })
                        userActivity = true
                    }
                })

                request(app)
                .post('/admin/bankCredit')
                .send(req)
                .expect(201)
                .expect(res)
                .end(function(err) {
                    if (err) return done(err)
                    impersonate.restore()
                    activity.restore()
                    expect(adminActivity).to.be(true, 'Admin activity was not logged')
                    expect(userActivity).to.be(true, 'User activity was not logged')
                    done()
                })
            })

            it('fails if not admin', function(done) {
                var impersonate = mock.impersonate(app, dummy.id())

                request(app)
                .post('/admin/bankCredit')
                .send({})
                .expect(401)
                .end(function(err) {
                    if (err) return done(err)
                    impersonate.restore()
                    done()
                })
            })

            it('fails if not logged in', function(done) {
                request(app)
                .post('/admin/bankCredit')
                .send({})
                .expect(401)
                .end(done)
            })
        })
    })
})
