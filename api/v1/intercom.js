var crypto = require('crypto')

module.exports = exports = function(app) {
    app.get('/v1/intercom', app.auth.primary, exports.intercom)
}

exports.hash = function(app, userId) {
    var hmac = crypto.createHmac('sha256', app.config.intercom_secret)
    hmac.update('' + userId)
    return hmac.digest('hex')
}

exports.intercom = function(req, res, next) {
    if (!req.apiKey.primary) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must be primary api key'
        })
    }

    req.app.conn.read.query({
        text: [
            'SELECT user_id, email_lower,',
            'FLOOR(EXTRACT(epoch FROM created_at))::int created_at',
            'FROM "user"',
            'WHERE user_id = $1'
        ].join('\n'),
        values: [req.user]
    }, function(err, dres) {
        if (err) return next(err)
        var row = dres.rows[0]

        res.send({
            app_id: req.app.config.intercom_app_id,
            user_id: row.user_id,
            email: row.email_lower,
            user_hash: exports.hash(req.app, row.user_id),
            created_at: row.created_at
        })
    })
}
