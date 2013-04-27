var sjcl = require('./vendor/sjcl')
, connect = require('express/node_modules/connect')
, util = require('util')
, auth = module.exports = function(conn) {
    return function(req, res, next) {
        if (req.user) return next()

        var authorization = req.headers.authorization

        if (!authorization) {
            res.header('www-authenticate', 'Basic realm="Authorization Required"')
            return res.send(401)
        }

        var parts = authorization.split(' ')
        , scheme = parts[0]
        , credentials = new Buffer(parts[1], 'base64').toString().split(':')
        , username = credentials[0]
        , password = credentials[1]

        if (scheme != 'Basic') return res.send(400)

        conn.query({
            text: 'SELECT user_id FROM api_key WHERE api_key_id = $1',
            values: [password]
        }, function(err, dres) {
            if (err) return next(err)

            if (!dres.rowCount) {
                return res.send(401, { name: 'UnknownApiKey', message: 'Unknown API key' })
            }

            req.user = dres.rows[0].user_id

            return next()
        })
    }
}
