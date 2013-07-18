var validate = require('./validate')

module.exports = exports = function(app) {
    app.post('/v1/spend', app.userAuth, exports.spend)
}

exports.spend = function(req, res, next) {
    if (!validate(req.body, 'spend', res)) return

    if (!req.apiKey.primary) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must be primary api key'
        })
    }

    var quote = req.body.market.substr(3, 3)

    req.app.conn.write.query({
        text: [
            'SELECT convert_bid($1, market_id, $2) oid',
            'FROM market',
            'WHERE base_currency_id || quote_currency_id = $3'
        ].join('\n'),
        values: [
            req.user,
            req.app.cache.parseCurrency(req.body.amount, quote),
            req.body.market
        ]
    }, function(err, dr) {
        if (err) {
            if (err.message.match(/non_negative_available/)) {
                return res.send(500, {
                    name: 'NoFunds',
                    message: 'Insufficient funds.'
                })
            }

            return next(err)
        }

        if (!dr.rowCount) {
            return res.send(404, {
                name: 'MarketNotFound',
                message: 'Market not found'
            })
        }

        res.send(201, {
            id: dr.rows[0].oid
        })
    })
}
