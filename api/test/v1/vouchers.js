/* global describe, it */
var expect = require('expect.js')
, crypto = require('crypto')
, vouchers = require('../../v1/vouchers')

describe('vouchers', function() {
    describe('configure', function() {
        it('adds expected routes', function() {
            var routes = []
            , app = {
                get: function(url) { routes.push('get ' + url) },
                post: function(url) { routes.push('post ' + url) }
            }
            vouchers.configure(app)
            expect(routes).to.contain('post /v1/vouchers')
            expect(routes).to.contain('post /v1/vouchers/:id/redeem')
        })
    })

    describe('createId', function() {
        it('creates a valid voucher id', function() {
            var id = vouchers.createId()
            expect(id).to.have.length(12)

            var cs = crypto.createHash('sha256')
            cs.update(id.substr(0, 10))

            var expected = cs.digest('hex').substr(0, 2).toUpperCase()
            , actual = id.substr(10, 2)

            expect(actual).to.be(expected)
        })
    })

    describe('create', function() {
        it('creates the voucher', function(done) {
            var cid = vouchers.createId
            vouchers.createId = function() {
                return 'aaaaaaaaaaaa'
            }

            var conn = {
                write: {
                    query: function(q, c) {
                        if (q.text.match(/activity/)) return
                        expect(q.text).to.contain('create_voucher($1, $2, $3, $4')
                        expect(q.values).to.eql(['aaaaaaaaaaaa', 101, 'BTC', 10e8])
                        c(null, { rows: [{ }] })
                    }
                }
            }
            , req = {
                user: 101,
                apiKey: { canWithdraw: true },
                body: {
                    amount: '10',
                    currency: 'BTC'
                },
                app: {
                    cache: {
                        parseCurrency: function(n, c) {
                            expect(n).to.be('10')
                            expect(c).to.be('BTC')
                            return 10e8
                        }
                    }
                }
            }
            , res = {
                send: function(n, r) {
                    expect(n).to.be(201)
                    expect(r.voucher).to.be('aaaaaaaaaaaa')
                    vouchers.createId = cid
                    done()
                }
            }

            vouchers.create(req, res, done)
        })

        it('requires canWithdraw api key permission', function(done) {
            vouchers.createId = function() {
                return 'aaaaaaaaaaaa'
            }

            var conn = {
                write: {
                    query: function(q, c) {
                        expect(q.text).to.contain('create_voucher($1, $2, $3, $4')
                        expect(q.values).to.eql(['aaaaaaaaaaaa', 101, 'BTC', 10e8])
                        c(null, { rows: [{ }] })
                    }
                }
            }
            , req = {
                user: 101,
                apiKey: {},
                body: {
                    amount: '10',
                    currency: 'BTC'
                },
                app: {
                    cache: {
                        parseCurrency: function(n, c) {
                            expect(n).to.be('10')
                            expect(c).to.be('BTC')
                            return 10e8
                        }
                    }
                }
            }
            , res = {
                send: function(n) {
                    expect(n).to.be(401)
                    done()
                }
            }

            vouchers.create(req, res, done)
        })
    })

    describe('redeem', function() {
        it('redeems the voucher', function(done) {
            var conn = {
                write: {
                    query: function(q, c) {
                        expect(q.text).to.contain('redeem_voucher($1, $2')
                        expect(q.values).to.eql(['aaaaaaaaaaaa', 102])
                        c(null, { rows: [{ }] })
                    }
                },
                read: {
                    query: function(q, c) {
                        c(null, { rows: [{ amount: 1e8, currency: 'BTC' }] })
                    }
                }
            }
            , req = {
                user: 102,
                apiKey: { canDeposit: true },
                params: {
                    id: 'aaaaaaaaaaaa'
                }
            }
            , res = {
                send: function(n) {
                    expect(n).to.be(204)
                    done()
                }
            }

            vouchers.redeem(req, res, done)
        })

        it('requires canDeposit api key permission', function(done) {
            var conn = {
                write: {
                    query: function(q, c) {
                        expect(q.text).to.contain('redeem_voucher($1, $2')
                        expect(q.values).to.eql(['aaaaaaaaaaaa', 102])
                        c(null, { rows: [{ }] })
                    }
                },
                read: {
                    query: function(q, c) {
                        c(null, { rows: [{ amount: 1e8, currency: 'BTC' }] })
                    }
                }
            }
            , req = {
                user: 102,
                apiKey: {},
                params: {
                    id: 'aaaaaaaaaaaa'
                }
            }
            , res = {
                send: function(n) {
                    expect(n).to.be(401)
                    done()
                }
            }

            vouchers.redeem(req, res, done)
        })
    })
})
