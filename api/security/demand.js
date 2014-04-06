var assert = require('assert')
, debug = require('debug')('snow:security:demand')
, format = require('util').format

module.exports = exports = function(app) {
    exports.app = app
    return exports
}

var types = ['any', 'trade', 'deposit', 'withdraw', 'primary', 'admin']
types.forEach(function(type) {
    exports[type] = function(req, res, next) {
        if (typeof req == 'number') {
            return exports.handler.bind(exports, type, req || 0)
        }

        exports.handler(type, 0, req, res, next)
    }
})

exports.handler = function() {
    return exports.demand.apply(this, arguments)
}

exports.demand = function(type, level, req, res, next) {
    if (!req.user) {
        debug('user is not set, demand has failed')
        return res.send(401, {
            name: 'NotAuthenticated',
            message: 'Both API key and session cookie missing'
        })
    }

    debug('demanding type %s and level %s', type, level)

    assert((req.apikey && !req.session) || (!req.apikey && req.session))
    assert.equal(typeof req.user, 'object')

    if (req.user.suspended) {
        return res.send(401, {
            name: 'UserSuspended',
            message: 'The user is suspended. Contact support'
        })
    }

    if (req.session && req.user.tfaSecret && !req.session.tfaPassed &&
        req.path != '/v1/twoFactor/auth')
    {
        debug('session is primary, user has 2fa enabled, but 2fa is not passed')
        return res.send(401, {
            name: 'OtpRequired',
            message: 'Two-factor authentication is required for this account'
        })
    }

    if ((type == 'primary' || type == 'admin') && !req.session) {
        debug('required type is primary, but request uses api key')

        return res.send(401, {
            name: 'SessionRequired',
            message: 'The action requires an interactive session'
        })
    }

    assert.equal(typeof req.user.securityLevel, 'number')

    if (req.user.securityLevel < level) {
        debug('security level %d is lower than required %d', req.user.securityLevel, level)

        return res.send(401, {
            name: 'SecurityLevelTooLow',
            message: 'The user\'s security level is too low'
        })
    }

    if (type == 'admin' && !req.user.admin) {
        return res.send(401, {
            name: 'UserNotAdmin',
            message: 'User is not admin'
        })
    }

    if (req.apikey && !~['any', 'primary'].indexOf(type)) {
        var mapping = {
            trade: 'canTrade',
            withdraw: 'canWithdraw',
            deposit: 'canDeposit'
        }[type]

        assert(mapping, 'mapping not found for type ' + type)

        if (!req.apikey[mapping]) {
            debug('apikey %j is missing required permission %s (%s)', req.apikey, type, mapping)

            return res.send(401, {
                name: 'PermissionRequired',
                message: format('The API key does not have the %s permission', type)
            })
        }
    }

    if (!req.session) return next()

    exports.extendRequestSession(req, res, next)
}

exports.extendRequestSession = function(req, res, next) {
    //debug('session has %ds left', Math.round((req.session.expires - new Date()) / 1e3))

    exports.app.security.session.extend(req.cookies.session, function(err) {
        if (err) {
            console.error('Failed to extend session:')
            console.error(err)
        }
        //debug('session extended')
        next()
    })
}

exports.otp = function(inner, optional) {
    return function(req, res, next) {
        inner(req, res, function() {
            assert(req.user)
            debug('OTP check for user: %s', req.user)
            if (!req.session) {
                debug('OTP check skipped for non-primary key (API)')
                return next()
            }

            if (!req.user.tfaSecret) {
                if (optional) {
                    debug('Optional OTP check skipped')
                    return next()
                }

                return res.send(401, {
                    name: 'OtpRequired',
                    messge: 'One-time password is required for this request, ' +
                        'but the user does not have OTP required.'
                })
            }

            if (!req.body.otp) {
                return res.send(401, {
                    name: 'OtpRequired',
                    message: 'One-time password required for this request'
                })
            }

            exports.app.security.tfa.consume(req.user.id, null, req.body.otp, function(err, correct) {
                if (err) return next(err)

                if (correct === null) {
                    return res.send(403, {
                        name: 'BlockedOtp',
                        message: 'Time-based one-time password has been consumed. Try again in 30 seconds'
                    })
                }

                if (!correct) {
                    return res.send(403, {
                        name: 'WrongOtp',
                        message: 'Wrong one-time password'
                    })
                }

                debug('otp is correct, setting tfaPassed on the user')

                req.session.tfaPassed = true
                req.app.security.session.update(req.cookies.session, req.session, next)
            })
        })
    }
}
