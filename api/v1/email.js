var Q = require('q')
, validate = require('./validate')
, email = module.exports = {}
, nodemailer = require('nodemailer')
, crypto = require('crypto')

email.configure = function(app, conn, auth) {
    app.smtp = nodemailer.createTransport(app.config.smtp.service, app.config.smtp.options)

    app.post('/v1/email/verify/send', auth, email.verifySend.bind(email, conn))
    app.get('/v1/email/verify/:code', email.verify.bind(email, conn))
}

email.sendVerificationEmail = function(conn, smtp, userId, cb) {
    var code = crypto.randomBytes(10).toString('hex')

    conn.write.query({
        text: [
            'SELECT email, create_email_verify_code($1, $2)',
            'FROM "user"',
            'WHERE user_id = $1'
        ].join('\n'),
        values: [userId, code]
    }, function(err, dr) {
        if (err) return cb(err)

        var url = 'https://justcoin.com/api/v1/email/verify/' + code

        var mail = {
            from: 'Justcoin <hello@justcoin.com>',
            to: dr.rows[0].email,
            subject: 'E-mail verification',
            html: '<p>To verify your e-mail address with Justcoin, follow this link:<br><br>' +
                '<a href="' + url + '">' + url + '</a></p><p>If you didn\'t request this, you can safely ignore this email.</p>'
        }

        smtp.sendMail(mail, cb)
    })
}

email.verifySend = function(conn, req, res, next) {
    email.sendVerificationEmail(conn, req.app.smtp, req.user, function(err) {
        if (err) {
            if (err.message == 'E-mail already verified') {
                return res.send(400, {
                    name: 'EmailAlreadyVerified',
                    message: 'The email for this user account has already been verified'
                })
            }

            return next(err)
        }

        res.send(204)
    })
}

email.verify = function(conn, req, res, next) {
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
