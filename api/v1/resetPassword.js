var crypto = require('crypto')
var log = require('../log')(__filename)
, debug = log.debug

module.exports = exports = function(app) {
    app.post('/v1/resetPassword', exports.resetPasswordBegin)
    app.get('/v1/resetPassword/continue/:code([a-f0-9]{20})',
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
    if (!req.app.validate(req.body, 'v1/password_reset_begin', res)) {
        log.error("resetPasswordBegin invalid request")
        return;
    }
    var email = req.body.email
    log.info("resetPasswordBegin email: %s", email);
    
    var emailCode = exports.createEmailCode()
    , phoneCode = exports.createPhoneCode()

    req.app.conn.write.get().query({
        text: [
            'SELECT reset_password_begin($1, $2, $3), language, phone_number, two_factor',
            'FROM "user"',
            'WHERE email_lower = $1'
        ].join('\n'),
        values: [req.body.email.toLowerCase(), emailCode, phoneCode]
    }, function(err, dr) {
        if (err) {
            
            if (err.message.match(/recent reset attempt/)) {
                log.log("resetPasswordBegin: ", err.message);
                // If a specific error is sent,
                //an attacker would know if the email is registered by sending twice a reset password
                return res.status(201).send({hasPhone:false, has2fa:false})
            }
            log.error("resetPasswordBegin: ", err.message);
            return next(err)
        }

        var row = dr.rows[0]

        if (!row) {
            log.info("resetPasswordBegin: no such user");
            // Do not return an error if the user cannot be found, it would be a privacy leak
            return res.status(201).send({hasPhone:false, has2fa:false})
        }

        var hasPhone = row.phone_number ? true : false;
        var has2fa = row.two_factor ? true : false;
        req.app.email.send(req.body.email, row.language, 'reset-password', {
            code: emailCode
        }, function(err) {
            if (err) return next(err)
            debug("resetPasswordBegin ok");
            res.status(201).send({hasPhone:hasPhone, has2fa:has2fa})
        })
    })
}

exports.resetPasswordContinue = function(req, res, next) {
    
    log.info("resetPasswordContinue code: %s", req.params.code); 
    
    req.app.conn.write.get().query({
        text: [
            'SELECT code, phone_number',
            'FROM reset_password_continue($1)'
        ].join('\n'),
        values: [req.params.code]
    }, function(err, dr) {
        if (err) {
            log.error("resetPasswordContinue ", err.message)
            if (err.message == 'Codes have expired') {
                return res.status(400).send({
                    name: 'CodesExpired',
                    message: 'The reset codes have expired'
                })
            }

            if (err.message == 'User not found or code already used') {
                return res.status(400).send({
                    name: 'ResetPasswordCodeInvalid',
                    message: 'Reset password code is invalid'
                })
            }

            return next(err)
        }

        res.send('Email confirmed. ' +
            'Close this window and go back to the password reset window.')

    })
}

function resetEnd(req, res, next){
    var phone_code = req.body.code ? req.body.code : "0000";
    
    log.info("resetEnd email: %s", req.body.email);
    
    req.app.conn.write.get().query({
        text: 'SELECT reset_password_end($1, $2, $3) success',
        values: [req.body.email, phone_code, req.body.key]
    }, function(err, dr) {
        if (err) {
            if (err.message == 'Must continue first.') {
                return res.status(400).send({
                    name: 'MustConfirmEmailFirst',
                    message: 'Email must checked first'
                })
            }

            return next(err)
        }

        res.status(204).end()
    })
}

exports.resetPasswordEnd = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/password_reset_end', res)) {
        log.error("resetPasswordEnd invalid request")
        return;
    }
    
    log.info("resetPasswordEnd email: %s, code %s, otp: %s", 
            req.body.email, req.body.code, req.body.otp); 
    req.app.conn.write.get().query({
        text: [
            'SELECT user_id, two_factor',
            'FROM "user"',
            'WHERE email_lower = $1'
        ].join('\n'),
        values: [req.body.email.toLowerCase()]
    }, function(err, dr) {
        if (err) {
            return next(err)
        }

        var row = dr.rows[0]

        if (!row) {
            return res.status(400).send({
                name: 'MustConfirmEmailFirst',
                message: 'Email must checked first'
            })
        }
        
        if(row.two_factor){
            debug("resetPasswordEnd has 2fa");
            req.app.security.tfa.consume(row.user_id, null, req.body.otp, function(err, correct) {
                if (err) {
                    debug("resetPasswordEnd 2fa error: %s", JSON.stringify(err));
                    return next(err)
                }
                
                debug("resetPasswordEnd correct 2fa: %s", correct);
                if (correct === null) {
                    return res.status(403).send({
                        name: 'BlockedOtp',
                        message: 'Time-based one-time password has been consumed. Try again in 30 seconds'
                    })
                }

                if (!correct) {
                    return res.status(403).send({
                        name: 'WrongOtp',
                        message: 'Wrong one-time password'
                    })
                }
                debug("resetPasswordEnd 2fa passed");
                resetEnd(req, res, next)
            })
        } else {
            resetEnd(req, res, next)
        }
    })
}
