var debug = require('debug')('snow:tfa')

module.exports = exports = function(app) {
    app.post('/v1/twoFactor/enable', app.security.demand.primary, exports.enable)
    app.post('/v1/twoFactor/remove', app.security.demand.otp(app.security.demand.primary), exports.remove)
    app.post('/v1/twoFactor/auth', app.security.demand.otp(app.security.demand.primary), exports.auth)
}
//, app.config.tfaBypass
exports.remove = function(req, res, next) {
    req.app.conn.write.query({
        text: [
            'UPDATE "user"',
            'SET two_factor = NULL',
            'WHERE user_id = $1 AND two_factor IS NOT NULL'
        ].join('\n'),
        values: [req.user.id]
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) {
            return res.send(400, {
                name: 'TwoFactorNotEnabled',
                message: 'Two-factor authentication is not set for this user'
            })
        }

        req.app.activity(req.user.id, 'RemoveTwoFactor', {})
        req.session.tfaPassed = false

        req.app.security.session.update(req.cookies.session, req.session, function(err) {
            if (err) return next(err)
            res.send(204)
        })
    })
}

exports.enable = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/twofactor_enable', res)) return

    var twoFactor = req.body.key

    debug('two factor key(secret) %s', twoFactor)

    var correct = req.app.security.tfa.validate(twoFactor, req.body.otp)

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
            'SET two_factor = $2, two_factor_success_counter = $3',
            'WHERE user_id = $1 AND two_factor IS NULL'
        ].join('\n'),
        values: [req.user.id, req.body.key, correct]
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) {
            return res.send(400, {
                name: 'TwoFactorAlreadyEnabled',
                message: 'Two-factor authentication is already set for this user'
            })
        }

        req.app.activity(req.user.id, 'EnableTwoFactor', {})

        req.session.tfaPassed = true

        req.app.security.session.update(req.cookies.session, req.session, function(err) {
            if (err) return next(err)
            res.send(204)
        })
    })
}

exports.auth = function(req, res) {
    // The actual authentication is done by the demand.otp call
    debug('auth SHOULD NOT BE CALLED');
    res.send(204)
}
