var reset = module.exports = {}
, _ = require('lodash')
, crypto = require('crypto')
, debug = require('debug')('snow:resetPassword')
, Tropo = require('tropo')

require('tropo-webapi')

reset.configure = function(app, conn, auth) {
    app.post('/v1/resetPassword', reset.resetPasswordBegin.bind(reset, conn))
    app.get('/v1/resetPassword/continue/:code', reset.resetPasswordContinue.bind(reset, conn))
    app.post('/v1/resetPassword/end', reset.resetPasswordEnd.bind(reset, conn))
}

reset.createEmailCode = function() {
    return crypto.randomBytes(10).toString('hex')
}

reset.createPhoneCode = function() {
    // Left pad the string with zeroes
    var s = Math.floor(Math.random() * 1e4).toString()
    return new Array(5 - s.length).join('0') + s
}

reset.resetPasswordBegin = function(conn, req, res, next) {
    var emailCode = reset.createEmailCode()
    , url = 'https://justcoin.com/api/v1/resetPassword/continue/' + emailCode
    , emailTemplate = _.template([
        '<p>A request has just been made to reset your password at Justcoin.',
        'If this was not you, ignore and delete this email.</p>',
        '<p>To reset your password now, follow this link:</p>',
        '<p><a href="<%= url %>"><%= url %></a></p>'
    ].join('\n'))

    conn.write.query({
        text: 'SELECT reset_password_begin($1, $2, $3)',
        values: [req.body.email, emailCode, reset.createPhoneCode()]
    }, function(err, dr) {
        if (err) {
            if (err.message == 'User has a recent reset attempt.') {
                return res.send(403, {
                    name: 'ResetPasswordLockedOut',
                    message: 'An attempt to reset the password has been made too recently'
                })
            }

            if (err.message == 'User not found') {
                return res.send(400, {
                    name: 'UserNotFound',
                    message: 'User not found'
                })
            }

            return next(err)
        }

        var mail = {
            from: 'Justcoin <hello@justcoin.com>',
            to: req.body.email,
            subject: 'Password reset',
            html: emailTemplate({ url: url })
        }

        req.app.smtp.sendMail(mail, function(err) {
            if (err) return next(err)
            res.send(204)
        })
    })
}

reset.resetPasswordContinue = function(conn, req, res, next) {
    conn.write.query({
        text: [
            'SELECT code, phone_number',
            'FROM reset_password_continue($1)'
        ].join('\n'),
        values: [req.params.code]
    }, function(err, dr) {
        if (err) {
            if (err.message == 'Codes have expired') {
                res.send(400, {
                    name: 'CodesExpired',
                    message: 'The reset codes have expired'
                })
            }

            if (err.message == 'User not found or code already used') {
                res.send(400, 'Code has already been used. Close this window.')
            }

            return next(err)
        }

        var code = dr.rows[0].code
        , phoneNumber = dr.rows[0].phone_number

        debug('correct code is %s', code)

        var tropo = new Tropo({
            voiceToken: req.app.config.tropo_voice_token,
            messagingToken: req.app.config.tropo_messaging_token
        })

        debug('using tropo token %s', req.app.config.tropo_voice_token)

        var codeMsg = [
            '<prosody rate=\'-5%\'>',
            'Your code is:' ,
            '</prosody>',
            '<prosody rate=\'-40%\'>',
            code.split('').join(', '),
            '</prosody>'
        ].join('')

        var msg = [
            '<speak>',
            '<prosody rate=\'-5%\'>',
            'Justcoin password reset.',
            '</prosody>',
            codeMsg,
            codeMsg,
            '</speak>'
        ].join('')

        debug('message %s', msg)

        debug('requesting call to %s', phoneNumber)

        tropo.call(phoneNumber, msg, function(err) {
            if (err) return next(err)

            res.send(200, 'Email confirmed. Next we will call you. Close this window and go back to the password reset window.')
        })
    })
}

reset.resetPasswordEnd = function(conn, req, res, next) {
    conn.write.query({
        text: 'SELECT reset_password_end($1, $2, $3)',
        values: [req.body.email, req.body.code, req.body.key]
    }, function(err, dr) {
        if (err) {
            return next(err)
        }

        res.send(204)
    })
}
