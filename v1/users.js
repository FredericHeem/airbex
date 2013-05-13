var Q = require('q')
, activities = require('./activities')
, verifyemail = require('../verifyemail')
, users = module.exports = {}
, validate = require('./validate')

users.configure = function(app, conn, auth) {
    app.get('/v1/whoami', auth, users.whoami.bind(users, conn))
    app.post('/v1/users', users.create.bind(users, conn))
    app.post('/v1/replaceLegacyApiKey', users.replaceLegacyApiKey.bind(users, conn))
    app.post('/v1/replaceApiKey', auth, users.replaceApiKey.bind(users, conn))
}

users.whoami = function(conn, req, res, next) {
	conn.read.query({
		text: 'SELECT user_id id, email, "admin" FROM "user" WHERE user_id = $1',
		values: [req.user]
	}, function(err, dres) {
		if (err) return next(err)
		if (!dres.rows.length) return res.send(404)
		res.send(dres.rows[0])
	})
}

users.create = function(conn, req, res, next) {
    if (!validate(req.body, 'user_create', res)) return

    verifyemail(req.body.email, function(err, ok) {
        if (err) {
            console.log('E-mail validation failed for %s:\n', req.body.email, err)
        }

        if (!ok) {
            if (err) console.log('email check failed', err)
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

            cb(err)
        })
    })
}

users.replaceLegacyApiKey = function(conn, req, res, next) {
    Q.ninvoke(conn.write, 'query', {
        text: 'SELECT replace_legacy_api_key($1, $2, $3)',
        values: [req.body.oldKey, req.body.oldSecret, req.body.newKey]
    }).then(function(dres) {
        res.send(200, {})
    }, function(err) {
        if (err.message === 'The specified old_key/old_secret combination was not found') {
            return res.send(401)
        }
        next(err)
    })
    .done()
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
