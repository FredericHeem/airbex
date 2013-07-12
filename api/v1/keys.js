var validate = require('./validate')
, activities = require('./activities')
, crypto = require('crypto')
, keys = module.exports = {}

keys.configure = function(app, conn, auth) {
    app.post('/v1/keys/replace', auth, keys.replace.bind(keys, conn))
    app.post('/v1/keys', auth, keys.create.bind(keys, conn))
    app.get('/v1/keys', auth, keys.index.bind(keys, conn))
    app.del('/v1/keys/:id', auth, keys.remove.bind(keys, conn))
}

keys.replace = function(conn, req, res, next) {
    if (!req.apiKey.primary) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must be primary key'
        })
    }

    if (!validate(req.body, 'keys_replace', res)) return

    conn.write.query({
        text: 'SELECT replace_api_key($1, $2)',
        values: [req.key, req.body.key]
    }, function(err) {
        if (err) return next(err)
        activities.log(req.user, 'ChangePassword', {})
        res.send(200, {})
    })
}

keys.remove = function(conn, req, res, next) {
    if (!req.apiKey.primary) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must be primary api key'
        })
    }

    conn.write.query({
        text: [
            'DELETE',
            'FROM api_key',
            'WHERE api_key_id = $2 AND user_id = $1 AND "primary" = FALSE'
        ].join('\n'),
        values: [req.user, req.params.id]
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) {
            return res.send(404, {
                name: 'ApiKeyNotFound',
                message: 'API does not exist, belongs to another user, or is primary.'
            })
        }

        res.send(204)
    })
}

keys.index = function(conn, req, res, next) {
    if (!req.apiKey.primary) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must be primary api key'
        })
    }

    conn.write.query({
        text: [
            'SELECT api_key_id, can_trade, can_withdraw, can_deposit',
            'FROM api_key',
            'WHERE user_id = $1 AND "primary" = FALSE'
        ].join('\n'),
        values: [req.user]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(200, dr.rows.map(function(row) {
            return {
                id: row.api_key_id,
                canTrade: row.can_trade,
                canDeposit: row.can_deposit,
                canWithdraw: row.can_withdraw
            }
        }))
    })
}

keys.generateApiKey = function() {
    var sum = crypto.createHash('sha256')
    , bytes = crypto.randomBytes(32)
    sum.update(bytes)
    return sum.digest('hex')
}

keys.create = function(conn, req, res, next) {
    if (!req.apiKey.primary) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must be primary api key'
        })
    }

    var key = keys.generateApiKey()

    conn.write.query({
        text: [
            'INSERT INTO api_key (api_key_id, user_id, "primary",',
            '   can_trade, can_deposit, can_withdraw)',
            'VALUES ($1, $2, FALSE, $3, $4, $5)'
        ].join('\n'),
        values: [
            key,
            req.user,
            req.body.canTrade,
            req.body.canDeposit,
            req.body.canWithdraw
        ]
    }, function(err) {
        if (err) return next(err)
        res.send(201, { id: key })
    })
}
