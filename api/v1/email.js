var crypto = require('crypto')

module.exports = exports = function(app) {
    app.post('/v1/email/verify/send', app.auth.primary, exports.verifySend)
    app.get('/v1/email/verify/:code', exports.verify)
}

exports.sendVerificationEmail = function(app, userId, cb) {
    var code = crypto.randomBytes(10).toString('hex')

    app.conn.write.query({
        text: [
            'SELECT email, language, create_email_verify_code($1, $2)',
            'FROM "user"',
            'WHERE user_id = $1'
        ].join('\n'),
        values: [userId, code]
    }, function(err, dr) {
        if (err) return cb(err)
        var row = dr.rows[0]
        app.email.send(row.email, row.language, 'verify-email', { code: code }, cb)
    })
}

exports.verifySend = function(req, res, next) {
    exports.sendVerificationEmail(req.app, req.user, function(err) {
        if (err) {
            if (err.message == 'E-mail already verified') {
                return res.send(400, {
                    name: 'EmailAlreadyVerified',
                    message: 'The email for this user account has already been verified'
                })
            }

            if (err.message.match(/^E-mail verification code issued less than/)) {
                return res.send(409, {
                    name: 'EmailVerificationLockedOut',
                    message: 'Another attempt to verify email was made not long ago. ' +
                        'Try again later.'
                })
            }

            return next(err)
        }

        res.send(204)
    })
}

exports.verify = function(req, res, next) {
    if (!req.params.code) {
        return res.send(400, 'Email verification code missing from url.')
    }

    if (!req.params.code.match(/^[a-z0-9]{20}$/)) {
        return res.send(400, 'Invalid email verification code in url.')
    }

    req.app.conn.write.query({
        text: 'SELECT verify_email($1) uid',
        values: [req.params.code]
    }, function(err, dr) {
        if (err) return next(err)
        var uid = dr.rows[0].uid

        if (!uid) {
            if (err.message == 'Code not found or expired') {
                return req.app.tarpit(function() {
                    res.send(404, 'Code not found or expired')
                })
            }

            return next(err)
        }

        req.app.auth.invalidate(req.app, uid)
        res.redirect(req.app.config.website_url)
    })
}
