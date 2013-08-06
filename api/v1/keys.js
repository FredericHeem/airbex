var crypto = require('crypto')

module.exports = exports = function(app) {
    app.post('/v1/keys/replace', app.auth.primary, exports.replace)
    app.post('/v1/keys', app.auth.primary, exports.create)
    app.get('/v1/keys', app.auth.primary, exports.index)
    app.del('/v1/keys/:id', app.auth.primary, exports.remove)
}

exports.replace = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/keys_replace', res)) return

    req.app.conn.write.query({
        text: 'SELECT replace_api_key($1, $2)',
        values: [req.key, req.body.key]
    }, function(err) {
        if (err) return next(err)
        req.app.activity(req.user, 'ChangePassword', {})
        res.send(204)
        req.app.auth.invalidate(req.app, req.user)
    })
}

exports.remove = function(req, res, next) {
    req.app.conn.write.query({
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

        req.app.auth.invalidate(req.app, req.params.id)

        res.send(204)
    })
}

exports.index = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT api_key_id, can_trade, can_withdraw, can_deposit',
            'FROM api_key',
            'WHERE user_id = $1 AND "primary" = FALSE'
        ].join('\n'),
        values: [req.user]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(row) {
            return {
                id: row.api_key_id,
                canTrade: row.can_trade,
                canDeposit: row.can_deposit,
                canWithdraw: row.can_withdraw
            }
        }))
    })
}

exports.generateApiKey = function() {
    var sum = crypto.createHash('sha256')
    , bytes = crypto.randomBytes(32)
    sum.update(bytes)
    return sum.digest('hex')
}

exports.create = function(req, res, next) {
    var key = exports.generateApiKey()

    req.app.conn.write.query({
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
        req.app.auth.invalidate(req.app, key)
        res.send(201, { id: key })
    })
}
