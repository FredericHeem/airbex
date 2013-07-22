/* global TropoWebAPI, TropoJSON */
var _ = require('lodash')
, async = require('async')
, Tropo = require('tropo')
, debug = require('debug')('snow:users')
, crypto = require('crypto')

require('tropo-webapi')

module.exports = exports = function(app) {
    app.get('/v1/whoami', app.auth.any, exports.whoami)
    app.post('/v1/users', exports.create)
    app.post('/v1/users/identity', app.auth.primary, exports.identity)
    app.post('/v1/users/verify/call', app.auth.primary, exports.startPhoneVerify)
    app.post('/v1/users/verify', app.auth.primary, exports.verifyPhone)
    app.post('/tropo', exports.tropo)
    app.patch('/v1/users/current', app.auth.primary, exports.patch)
}

exports.patch = function(req, res, next) {
    var updates = {}
    , values = [req.user]

    if (req.body.language !== undefined) {
        updates['language'] = req.body.language
    }

    var updateText = _.map(updates, function(value, key) {
        values.push(value)
        return key + ' = $' + values.length
    })

    if (values.length === 1) {
        return res.send(400, {
            name: 'NoUpdates',
            message: 'No updates were provided'
        })
    }

    req.app.conn.write.query({
        text: [
            'UPDATE "user"',
            'SET ' + updateText,
            'WHERE user_id = $1'
        ].join('\n'),
        values: values
    }, function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) return next(new Error('User ' + req.user + ' not found'))
        res.send(204)
    })
}

exports.createBankVerifyCode = function() {
    return crypto.randomBytes(2).toString('hex')
}

exports.whoami = function(req, res, next) {
    // TODO: extract to view
	req.app.conn.read.query({
		text: [
            'SELECT',
            '   user_id id,',
            '   email,',
            '   email_verified_at,',
            '   admin,',
            '   tag,',
            '   phone_number phone,',
            '   first_name firstname,',
            '   last_name lastname,',
            '   address,',
            '   country,',
            '   postal_area postalarea,',
            '   language,',
            '   city',
            'FROM "user"',
            'WHERE user_id = $1'
        ].join('\n'),
		values: [req.user]
	}, function(err, dres) {
		if (err) return next(err)
		if (!dres.rows.length) return res.send(404)
        // PostgreSQL is not case sensitive. Case sensitive naming must be done here
        // and not using "AS".
        var row = dres.rows[0]
		res.send({
            id: row.id,
            email: row.email,
            admin: row.admin,
            tag: row.tag,
            phone: row.phone,
            firstName: row.firstname,
            lastName: row.lastname,
            address: row.address,
            emailVerified: row.email_verified_at !== null,
            country: row.country,
            postalArea: row.postalarea,
            city: row.city,
            language: row.language
        })
	})
}

exports.create = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/user_create', res)) return

    req.app.verifyEmail(req.body.email, function(err, ok) {
        if (err) {
            debug('E-mail validation failed for %s:\n', req.body.email, err)
        }

        if (!ok) {
            if (err) debug('email check failed', err)
            debug('email check failed for %s', req.body.email)

            return res.send(403, {
                name: 'EmailFailedCheck',
                message: 'E-mail did not pass validation'
            })
        }

        req.app.conn.write.query({
            text: 'SELECT create_user($1, $2) user_id',
            values: [req.body.email, req.body.key]
        }, function(err, dr) {
            if (!err) {
                var row = dr.rows[0]
                req.app.activity(row.user_id, 'Created', {})
                return res.send(201, { id: row.user_id })
            }

            if (err.message.match(/email_regex/)) {
                return res.send(403, {
                    name: 'InvalidEmail',
                    message: 'e-mail is invalid'
                })
            }

            if (err.message.match(/api_key_pkey/) ||
                err.message.match(/email_lower_unique/))
            {
                return res.send(403, {
                    name: 'EmailAlreadyInUse',
                    message:'e-mail is already in use'
                })
            }

            next(err)
        })
    })
}

exports.identity = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/user_identity', res)) return

    var query = {
        text: [
            'UPDATE "user"',
            'SET',
            '   first_name = $2,',
            '   last_name = $3,',
            '   address = $4,',
            '   country = $5,',
            '   city = $6,',
            '   postal_area = $7',
            'WHERE',
            '   user_id = $1 AND',
            '   first_name IS NULL'
        ].join('\n'),
        values: [req.user, req.body.firstName, req.body.lastName, req.body.address,
            req.body.country, req.body.city, req.body.postalArea]
    }

    req.app.conn.write.query(query, function(err, dr) {
        if (err) {
            return next(err)
        }

        if (!dr.rowCount) {
            return res.send(404, {
                name: 'IdentityAlreadySet',
                message: 'The identity for the user has already been set.'
            })
        }

        req.app.activity(req.user, 'IdentitySet', {})
        return res.send(204)
    })
}

exports.verifyPhone = function(req, res, next) {
    req.app.conn.write.query({
        text: 'SELECT verify_phone($1, $2) success',
        values: [req.user, req.body.code]
    }, function(err, dr) {
        if (err) {
            if (err.message == 'User already has a verified phone number.') {
                return res.send(400, {
                    name: 'AlreadyVerified',
                    message: 'A phone number has already been verified for this user'
                })
            }

            return next(err)
        }

        if (!dr.rows[0].success) {
            return res.send(403, {
                name: 'VerificationFailed',
                message: 'Verification failed. The code is wrong or ' +
                    'you may not verify at this time.'
            })
        }

        res.send(204)
    })
}

exports.startPhoneVerify = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/user_verify_call', res)) return

    debug('processing request to start phone verification')

    req.app.conn.write.query({
        text: 'SELECT create_phone_number_verify_code($2, $1) code',
        values: [req.user, req.body.number]
    }, function(err, dr) {
        if (err) {
            if ((/^User is locked out/i).exec(err.message)) {
                return res.send(403, {
                    name: 'LockedOut',
                    message: err.message
                })
            }

            if (err.message.match(/User already has a verified phone number/)) {
                return res.send(400, {
                    name: 'PhoneAlreadyVerified',
                    message: 'User already has a verified phone number'
                })
            }

            if (err.message == 'Another user has already verified that phone number.') {
                return res.send(403, {
                    name: 'PhoneNumberInUse',
                    message: err.message
                })
            }

            return next(err)
        }

        var code = dr.rows[0].code

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
            '.</prosody>'
        ].join('')

        var msg = [
            '<speak>',
            '<prosody rate=\'-5%\'>',
            'Welcome to Just-coin.',
            '</prosody>',
            codeMsg,
            codeMsg,
            '</speak>'
        ].join('')

        debug('message %s', msg)

        debug('requesting call to %s', req.body.number)

        async.parallel([
            function(next) {
                // call
                tropo.call(req.body.number, msg, function(err) {
                    if (err) return next(err)
                    next()
                })
            }
        ], function(err) {
            if (err) return next(err)
            res.send(204)
        })
    })
}

exports.tropo = function(req, res) {
    var params = req.body.session.parameters

    debug('processing tropo request with params %j', params)

    if (params.token != req.app.config.tropo_voice_token) {
        debug('specified tropo token %s does not match config token %s',
            params.token, req.app.config.tropo_voice_token)
        return res.send(404)
    }

    debug('configuring response')

    var tropo = new TropoWebAPI()

    tropo.call(params.numberToDial)
    tropo.wait(2000);
    tropo.say(params.msg)

    var tropoJSON = TropoJSON(tropo)

    debug('sending tropo response %j', tropoJSON)

    res.send(tropoJSON)
}
