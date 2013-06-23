module.exports = function(conn) {
    return function(req, res, next) {
        if (req.user) return next()

        if (!req.query.key) {
            return res.send(401, {
                name: 'KeyMissing',
                message:'key parameter missing from query string'
            })
        }

        conn.read.query({
            text: 'SELECT user_id FROM api_key WHERE api_key_id = $1',
            values: [req.query.key]
        }, function(err, dres) {
            if (err) return next(err)

            if (!dres.rowCount) {
                return req.app.tarpit(function() {
                    res.send(401, { name: 'UnknownApiKey', message: 'Unknown API key' })
                })
            }

            req.user = dres.rows[0].user_id
            req.key = req.query.key

            return next()
        })
    }
}
