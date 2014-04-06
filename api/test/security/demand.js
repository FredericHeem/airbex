/* global describe, it */
var expect = require('expect.js')
, mock = require('../mock')
, app = require('../..')
, demand = app.security.demand

describe('demand', function() {
    it('defines shorthand methods', function() {
        expect(demand.any).to.be.a('function')
        expect(demand.admin).to.be.a('function')
        expect(demand.deposit).to.be.a('function')
        expect(demand.withdraw).to.be.a('function')
        expect(demand.trade).to.be.a('function')
        expect(demand.primary).to.be.a('function')
    })

    describe('demand', function() {
        it('denies suspended users', function(done) {
            var req = {
                user: {
                    suspended: true
                },
                session: {}
            }
            , res = {}

            mock.once(res, 'send', function(code, data) {
                expect(code).to.be(401)
                expect(data.name).to.be('UserSuspended')
                done()
            })

            demand.demand('primary', 0, req, res)
        })

        it('requires tfa for primary', function(done) {
            var req = {
                session: {},
                user: {
                    tfaSecret: 'secret'
                }
            }
            , res = {}

            mock.once(res, 'send', function(code, data) {
                expect(code).to.be(401)
                expect(data.name).to.be('OtpRequired')
                done()
            })

            demand.demand('primary', 0, req, res)
        })

        it('does not require tfa for non-primary', function(done) {
            var req = {
                user: {
                    tfaSecret: 'secret',
                    securityLevel: 0
                },
                apikey: {}
            }
            , res = {}

            demand.demand('any', 0, req, res, done)
        })

        it('disallows using non-primary when demanding primary', function(done) {
            var req = {
                user: {},
                apikey: {}
            }
            , res = {}

            mock.once(res, 'send', function(code, data) {
                expect(code).to.be(401)
                expect(data.name).to.be('SessionRequired')
                done()
            })

            demand.demand('primary', 0, req, res)
        })

        it('requires primary for admin', function(done) {
            var req = {
                user: {},
                apikey: {}
            }
            , res = {}

            mock.once(res, 'send', function(code, data) {
                expect(code).to.be(401)
                expect(data.name).to.be('SessionRequired')
                done()
            })

            demand.demand('admin', 0, req, res)
        })

        it('denies too low security level', function(done) {
            var req = {
                user: {
                    securityLevel: 1
                },
                session: {
                }
            }
            , res = {}

            mock.once(res, 'send', function(code, data) {
                expect(code).to.be(401)
                expect(data.name).to.be('SecurityLevelTooLow')
                done()
            })

            demand.demand('any', 2, req, res)
        })

        it('accepts high enough security level', function(done) {
            var req = {
                user: {
                    securityLevel: 1
                },
                session: {}
            }
            , res = {}

            mock.once(app.security.demand, 'extendRequestSession', function(req, res, next) {
                next()
            })

            demand.demand('any', 1, req, res, done)
        })

        it('checks trade permission', function(done) {
            var req = {
                user: {
                    securityLevel: 2
                },
                apikey: {}
            }
            , res = {}

            mock.once(res, 'send', function(code, data) {
                expect(code).to.be(401)
                expect(data.name).to.be('PermissionRequired')
                done()
            })

            demand.demand('trade', 2, req, res)
        })

        it('checks withdraw permission', function(done) {
            var req = {
                user: {
                    securityLevel: 2
                },
                apikey: {}
            }
            , res = {}

            mock.once(res, 'send', function(code, data) {
                expect(code).to.be(401)
                expect(data.name).to.be('PermissionRequired')
                done()
            })

            demand.demand('withdraw', 2, req, res)
        })

        it('checks deposit permission', function(done) {
            var req = {
                user: {
                    securityLevel: 2
                },
                apikey: {
                    canTrade: true,
                    canWithdraw: true,
                    canDeposit: false
                }
            }
            , res = {}

            mock.once(res, 'send', function(code, data) {
                expect(code).to.be(401)
                expect(data.name).to.be('PermissionRequired')
                done()
            })

            demand.demand('deposit', 2, req, res)
        })

        it('extends session for primary', function(done) {
            var req = {
                user: {
                    securityLevel: 0
                },
                cookies: {
                    session: 'key'
                },
                session: {}
            }
            , res = {}

            mock.once(app.security.session, 'extend', function(key, cb) {
                expect(key).to.be('key')
                expect(cb).to.be.a('function')
                done()
            })

            demand.demand('primary', 0, req, res, function() {
            })
        })
    })
})
