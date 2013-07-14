var email = module.exports = {}
, nodemailer = require('nodemailer')
, crypto = require('crypto')
, smtp
, conn
, app

email.configure = function(a, c, auth) {
    app = a
    conn = c

    smtp = nodemailer.createTransport(
        app.config.smtp.service,
        app.config.smtp.options)

    app.post('/v1/email/verify/send', auth, email.verifySend)
    app.get('/v1/email/verify/:code', email.verify)
}

email.sendVerificationEmail = function(userId, cb) {
    var code = crypto.randomBytes(10).toString('hex')

    conn.write.query({
        text: [
            'SELECT email, language, create_email_verify_code($1, $2)',
            'FROM "user"',
            'WHERE user_id = $1'
        ].join('\n'),
        values: [userId, code]
    }, function(err, dr) {
        if (err) return cb(err)
        var row = dr.row
        app.email.send(row.email, row.language, 'verify-email', { code: code }, cb)
    })
}

email.verifySend = function(req, res, next) {
    if (!req.apiKey.primary) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must be primary api key'
        })
    }

    email.sendVerificationEmail(req.user, function(err) {
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

email.verify = function(req, res, next) {
    if (!req.params.code) {
        return res.send(400, 'Email verification code missing from url.')
    }

    if (!req.params.code.match(/^[a-z0-9]{20}$/)) {
        return res.send(400, 'Invalid email verification code in url.')
    }

    conn.write.query({
        text: 'SELECT verify_email($1)',
        values: [req.params.code]
    }, function(err) {
        if (err) {
            if (err.message == 'Code not found or expired') {
                return req.app.tarpit(function() {
                    res.send(404, 'Code not found or expired')
                })
            }

            return next(err)
        }

        res.send(200, 'Your e-mail has been verified. You can close this window.')
    })
}
