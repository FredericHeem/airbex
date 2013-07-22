var crypto = require('crypto')
, debug = require('debug')('snow:resetPassword')

module.exports = exports = function(app) {
    app.post('/v1/resetPassword', exports.resetPasswordBegin)
    app.get('/v1/resetPassword/continue/:code',
        exports.resetPasswordContinue)
    app.post('/v1/resetPassword/end', exports.resetPasswordEnd)
}

exports.createEmailCode = function() {
    return crypto.randomBytes(10).toString('hex')
}

exports.createPhoneCode = function() {
    // Left pad the string with zeroes
    var s = Math.floor(Math.random() * 1e4).toString()
    return new Array(5 - s.length).join('0') + s
}

exports.resetPasswordBegin = function(req, res, next) {
    var emailCode = exports.createEmailCode()
    , phoneCode = exports.createPhoneCode()

    req.app.conn.write.query({
        text: [
            'SELECT reset_password_begin($1, $2, $3), language',
            'FROM "user"',
            'WHERE email_lower = $1'
        ].join('\n'),
        values: [req.body.email.toLowerCase(), emailCode, phoneCode]
    }, function(err, dr) {
        if (err) {
            if (err.message.match(/recent reset attempt/)) {
                return res.send(403, {
                    name: 'ResetPasswordLockedOut',
                    message: 'An attempt to reset the password has been made too recently'
                })
            }

            if (err.message.match(/User not found/)) {
                return res.send(400, {
                    name: 'UserNotFound',
                    message: 'User not found'
                })
            }

            return next(err)
        }

        var row = dr.rows[0]

        if (!row) {
            return res.send(400, {
                name: 'UserNotFound',
                message: 'User not found'
            })
        }

        req.app.email.send(req.body.email, row.language, 'reset-password', {
            code: emailCode
        }, function(err) {
            if (err) return next(err)
            res.send(204)
        })
    })
}

exports.resetPasswordContinue = function(req, res, next) {
    req.app.conn.write.query({
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

        debug('requesting call to %s', phoneNumber)

        res.send('Email confirmed. Next we will call you. ' +
            'Close this window and go back to the password reset window.')

        setTimeout(function() {
            req.app.tropo.say(phoneNumber, msg, function(err) {
                if (!err) return debug('call placed')
                console.error('Failed to call user at %s', phoneNumber)
                console.error(err)
            })
        }, exports.callDelay)
    })
}

exports.callDelay = 10e3

exports.resetPasswordEnd = function(req, res, next) {
    req.app.conn.write.query({
        text: 'SELECT reset_password_end($1, $2, $3)',
        values: [req.body.email, req.body.code, req.body.key]
    }, function(err) {
        if (err) {
            return next(err)
        }

        res.send(204)
    })
}
