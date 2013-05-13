var sjcl = require('../vendor/sjcl')
, connect = require('express/node_modules/connect')
, util = require('util')
, auth = module.exports = function(conn) {
    return function(req, res, next) {
        if (req.user) return next()
        if (!req.query.key) return res.send(401, {
            name: 'KeyMissing',
            message:'key parameter missing from query string'
        })

        conn.read.query({
            text: [
                'SELECT u.user_id',
                'FROM api_key a',
                'INNER JOIN "user" u ON u.user_id = a.user_id',
                'WHERE a.api_key_id = $1 AND u.admin = TRUE'
            ].join('\n'),
            values: [req.query.key]
        }, function(err, dres) {
            if (err) return next(err)

            if (!dres.rowCount) {
                return res.send(401, { name: 'UnknownApiKey', message: 'Unknown admin API key' })
            }

            req.user = dres.rows[0].user_id
            req.key = req.query.key

            return next()
        })
    }
}
