module.exports = function() {
    return function(req, res, next) {
        if (req.user) return next()

        if (!req.query.key) {
            return res.send(401, {
                name: 'KeyMissing',
                message:'key parameter missing from query string'
            })
        }

        req.app.conn.read.query({
            text: [
                'SELECT',
                '   a.user_id,',
                '   a.can_withdraw,',
                '   a.can_deposit,',
                '   a.can_trade,',
                '   a."primary",',
                '   u.suspended',
                'FROM api_key a',
                'INNER JOIN "user" u ON u.user_id = a.user_id',
                'WHERE a.api_key_id = $1'
            ].join('\n'),
            values: [req.query.key]
        }, function(err, dres) {
            if (err) return next(err)

            if (!dres.rowCount) {
                return req.app.tarpit(function() {
                    res.send(401, { name: 'UnknownApiKey', message: 'Unknown API key' })
                })
            }

            var row = dres.rows[0]

            if (row.suspended) {
                return res.send(401, {
                    name: 'UserSuspended',
                    message: 'User account is suspended. Contact support.'
                })
            }

            req.user = row.user_id
            req.key = req.query.key

            req.apiKey = {
                canTrade: row.can_trade,
                canDeposit: row.can_deposit,
                canWithdraw: row.can_withdraw,
                primary: row.primary
            }

            return next()
        })
    }
}
