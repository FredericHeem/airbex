var Q = require('q')
, users = module.exports = {}
, validate = require('./validate')

users.configure = function(app, conn, auth) {
    app.get('/whoami', auth, users.whoami.bind(users, conn))
    app.post('/users', users.create.bind(users, conn))
    app.post('/replaceLegacyApiKey', users.replaceLegacyApiKey.bind(users, conn))
}

users.whoami = function(conn, req, res, next) {
	conn.query({
		text: 'SELECT user_id, email FROM "user" WHERE user_id = $1',
		values: [req.user]
	}, function(err, dres) {
		if (err) return next(err)
		if (!dres.rows.length) return res.send(404)
		res.send(dres.rows[0])
	})
}

users.create = function(conn, req, res, next) {
    console.log(req.body)
    if (!validate(req.body, 'user_create', res)) return

    Q.ninvoke(conn, 'query', {
        text: 'select create_user($1, $2) user_id',
        values: [req.body.email, req.body.key]
    })
    .then(function(cres) {
        res.send(201, { user_id: cres.rows[0].user_id })
    }, function(err) {
        if (err.message === 'new row for relation "user" violates check constraint "email_regex"') {
            return res.send(403, { name: 'InvalidEmail', messge: 'e-mail is invalid' })
        }

        if (err.message === 'duplicate key value violates unique constraint "api_key_pkey"') {
            return res.send(403, { name: 'EmailAlreadyInUse', message:'e-mail is already in use' })
        }

        next(err)
    })
    .done()
}

users.replaceLegacyApiKey = function(conn, req, res, next) {
    Q.ninvoke(conn, 'query', {
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
