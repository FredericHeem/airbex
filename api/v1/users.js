var Q = require('q')
, _ = require('lodash')
, activities = require('./activities')
, verifyemail = require('../verifyemail')
, users = module.exports = {}
, async = require('async')
, validate = require('./validate')
, Tropo = require('tropo')
, debug = require('debug')('snow:users')
, crypto = require('crypto')

require('tropo-webapi')

users.configure = function(app, conn, auth) {
    app.get('/v1/whoami', auth, users.whoami.bind(users, conn))
    app.post('/v1/users', users.create.bind(users, conn))
    app.post('/v1/users/identity', auth, users.identity.bind(users, conn))
    app.post('/v1/replaceApiKey', auth, users.replaceApiKey.bind(users, conn))
    app.post('/v1/users/verify/call', auth, users.startPhoneVerify.bind(users, conn))
    app.post('/v1/users/verify', auth, users.verifyPhone.bind(users, conn))
    app.get('/v1/users/bankAccounts', auth, users.bankAccounts.bind(users, conn))
    app.post('/tropo', users.tropo.bind(users, conn))
}

users.whoami = function(conn, req, res, next) {
    // TODO: extract to view
	conn.read.query({
		text: [
            'SELECT',
            '   user_id id,',
            '   email,',
            '   email_verified_at,',
            '   admin,',
            '   phone_number phone,',
            '   first_name firstname,',
            '   last_name lastname,',
            '   address,',
            '   country,',
            '   postal_area postalarea,',
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
            phone: row.phone,
            firstName: row.firstname,
            lastName: row.lastname,
            address: row.address,
            emailVerified: row.email_verified_at !== null,
            country: row.country,
            postalArea: row.postalarea,
            city: row.city
        })
	})
}

users.bankAccounts = function(conn, req, res, next) {
    conn.read.query({
        text: [
            'SELECT * FROM bank_account WHERE user_id = $1'
        ].join('\n'),
        values: [req.user]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(200, dr.rows.map(function(row) {
            return _.extend(_.pick(row, 'iban', 'swiftbic'), {
                id: row.bank_account_id,
                displayName: row.display_name,
                accountNumber: row.account_number,
                routingNumber: row.routing_number
            })
        }))
    })
}

users.create = function(conn, req, res, next) {
    if (!validate(req.body, 'user_create', res)) return

    verifyemail(req.body.email, function(err, ok) {
        if (err) {
            debug('E-mail validation failed for %s:\n', req.body.email, err)
        }

        if (!ok) {
            if (err) debug('email check failed', err)
            debug('email check failed for %s', req.body.email)
            return res.send(403, { name: 'EmailFailedCheck', message: 'E-mail did not pass validation' })
        }

        conn.write.query({
            text: 'SELECT create_user($1, $2) user_id',
            values: [req.body.email, req.body.key]
        }, function(err, cres) {
            if (!err) {
                activities.log(conn, cres.rows[0].user_id, 'Created', {})
                return res.send(201, { id: cres.rows[0].user_id })
            }

            if (err.message === 'new row for relation "user" violates check constraint "email_regex"') {
                return res.send(403, { name: 'InvalidEmail', message: 'e-mail is invalid' })
            }

            if (err.message === 'duplicate key value violates unique constraint "api_key_pkey"' ||
                err.message === 'duplicate key value violates unique constraint "email_lower_unique"') {
                return res.send(403, { name: 'EmailAlreadyInUse', message:'e-mail is already in use' })
            }

            next(err)
        })
    })
}

users.identity = function(conn, req, res, next) {
    if (!validate(req.body, 'user_identity', res)) return
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

    conn.write.query(query, function(err, dr) {
        if (err) {
            return next(err)
        }

        if (!dr.rowCount) {
            return res.send(404, {
                name: 'IdentityAlreadySet',
                message: 'The identity for the user has already been set.'
            })
        }

        activities.log(conn, req.user, 'IdentitySet', {})
        return res.send(204)
    })
}

users.replaceApiKey = function(conn, req, res, next) {
    if (!validate(req.body, 'user_replace_api_key', res)) return
    Q.ninvoke(conn.write, 'query', {
        text: 'SELECT replace_api_key($1, $2)',
        values: [req.key, req.body.key]
    }).then(function(dres) {
        res.send(200, {})
    }, function(err) {
        // TODO: error message when key does not exist.
        next(err)
    })
    .done()
}

users.verifyPhone = function(conn, req, res, next) {
    conn.write.query({
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

        if (!dr.rows[0].success) return res.send(403, {
            name: 'VerificationFailed',
            message: 'Verification failed. The code is wrong or you may not verify at this time.'
        })
        res.send(204)
    })
}

users.startPhoneVerify = function(conn, req, res, next) {
    debug('processing request to start phone verification')

    conn.write.query({
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
            '</prosody>'
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

users.tropo = function(conn, req, res, next) {
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
