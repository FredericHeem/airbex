var speakeasy = require('speakeasy')
, assert = require('assert')
, usedOtp = []
, debug = require('debug')('tfa')

module.exports = exports = function(app) {
    app.post('/v1/twoFactor/enable', app.auth.primary, exports.enable)
    app.post('/v1/twoFactor/remove', app.auth.primary, exports.remove)
    app.post('/v1/twoFactor/auth', app.auth.primary, exports.auth)
    app.post('/v1/twoFactor/logout', app.auth.primary, exports.logout)
}

exports.remove = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/twofactor_remove', res)) return

    var twoFactor = req.apiKey.twoFactor

    if (!twoFactor) {
        return res.send(401, {
            name: 'TwoFactorNotEnabled',
            message: 'Two-factor is not enabled for the user'
        })
    }

    debug('two factor key(secret) %s', twoFactor)

    var correct = exports.consume(twoFactor, req.body.otp)

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

    req.app.conn.write.query({
        text: [
            'UPDATE "user"',
            'SET two_factor = NULL',
            'WHERE user_id = $1 AND two_factor IS NOT NULL'
        ].join('\n'),
        values: [req.user]
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) {
            return res.send(400, {
                name: 'TwoFactorNotEnabled',
                message: 'Two-factor authentication is not set for this user'
            })
        }

        req.app.activity(req.user, 'RemoveTwoFactor', {})
        req.app.auth.invalidate(req.app, req.user)

        res.send(204)
    })
}

exports.enable = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/twofactor_enable', res)) return

    var twoFactor = req.body.key

    debug('two factor key(secret) %s', twoFactor)

    var correct = exports.consume(twoFactor, req.body.otp)

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

    req.app.conn.write.query({
        text: [
            'UPDATE "user"',
            'SET two_factor = $2',
            'WHERE user_id = $1 AND two_factor IS NULL'
        ].join('\n'),
        values: [req.user, req.body.key]
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) {
            return res.send(400, {
                name: 'TwoFactorAlreadyEnabled',
                message: 'Two-factor authentication is already set for this user'
            })
        }

        req.app.auth.invalidate(req.app, req.user)
        exports.grant(req)
        req.app.activity(req.user, 'EnableTwoFactor', {})

        res.send(204)
    })
}

exports.logout = function(req, res) {
    if (!req.app.auth.tfa[req.key]) {
        return res.send(400, {
            name: 'NotTwoFactorAuthed',
            message: 'The API key is not two factor authenticated'
        })
    }

    delete req.app.auth.tfa[req.key]
    return res.send(204)
}

/**
 * Consume a one-time password
 * @param  {string} twoFactor   The two-factor key/secret
 * @param  {string} guess       User supplied otp
 * @return {boolean}            Null if the user is locked out,
 *                              else whether the guess was corrected
 */
exports.consume = function(key, guess) {
    var answer = speakeasy.time({ key: key, encoding: 'base32' })
    assert(answer)

    if (~usedOtp.indexOf(key + answer)) {
        return null
    }

    usedOtp.push(key + answer)

    if (usedOtp.length > 10000) {
        usedOtp.shift()
    }

    debug('expected otp %s, received %s', answer, guess)

    return guess == answer
}

exports.auth = function(req, res) {
    if (!req.app.validate(req.body, 'v1/twofactor_auth', res)) return

    var twoFactor = req.apiKey.twoFactor

    if (!twoFactor) {
        return res.send(401, {
            name: 'TwoFactorNotEnabled',
            message: 'Two-factor is not enabled for the user'
        })
    }

    debug('two factor key(secret) %s', twoFactor)

    var correct = exports.consume(twoFactor, req.body.otp)

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

    exports.grant(req)

    res.send(204)
}

exports.grant = function(req) {
    req.app.auth.tfa[req.key] = +new Date() + 1000 * 60 * 30
}
