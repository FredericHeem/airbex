var crypto = require('crypto')
, debug = require('debug')('snow:intercom')

module.exports = exports = function(app) {
    app.get('/v1/intercom', app.userAuth, exports.intercom)
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
            'FLOOR(EXTRACT(epoch FROM created))::int created',
            'FROM "user"',
            'WHERE user_id = $1'
        ].join('\n'),
        values: [req.user]
    }, function(err, dres) {
        if (err) return next(err)

        var hmac = crypto.createHmac('sha256', req.app.config.intercom_secret)
        , user = dres.rows[0]
        hmac.update('' + user.user_id)

        var userHash = hmac.digest('hex')

        debug('hashed user id %s with secret %s to get %s',
            user.user_id, req.app.config.intercom_secret, userHash)

        res.send({
            app_id: req.app.config.intercom_app_id,
            user_id: user.user_id,
            email: user.email_lower,
            user_hash: userHash,
            created_at: user.created
        })
    })
}
