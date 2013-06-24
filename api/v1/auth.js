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
            text: [
                'SELECT user_id, can_withdraw, can_deposit, can_trade, "primary"',
                'FROM api_key',
                'WHERE api_key_id = $1'
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
