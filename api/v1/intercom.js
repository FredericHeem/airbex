var crypto = require('crypto')
, debug = require('debug')('intercom')
, intercom = module.exports = {}

intercom.configure = function(app, conn, auth) {
    app.get('/v1/intercom', auth, intercom.intercom.bind(intercom, conn, app.config))
}

intercom.intercom = function(conn, config, req, res, next) {
    if (!req.apiKey.primary) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must be primary api key'
        })
    }

    conn.read.query({
        text: [
            'SELECT user_id, email_lower,',
            'FLOOR(EXTRACT(epoch FROM created))::int created',
            'FROM "user"',
            'WHERE user_id = $1'
        ].join('\n'),
        values: [req.user]
    }, function(err, dres) {
        if (err) return next(err)

        var hmac = crypto.createHmac('sha256', config.intercom_secret)
        , user = dres.rows[0]
        hmac.update('' + user.user_id)

        var userHash = hmac.digest('hex')

        debug('hashed user id %s with secret %s to get %s',
            user.user_id, config.intercom_secret, userHash)

        res.send({
            app_id: config.intercom_app_id,
            user_id: user.user_id,
            email: user.email_lower,
            user_hash: userHash,
            created_at: user.created
        })
    })
}
