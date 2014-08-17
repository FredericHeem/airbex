var log = require('../log')(__filename)
, debug = log.debug

module.exports = exports = function(app) {
    app.post('/v1/spend', app.security.demand.trade, exports.spend)
}

exports.spend = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/spend', res)) return

    debug("spend: ", JSON.stringify(req.body));
    
    var quote = req.app.cache.getQuoteCurrency(req.body.market)

    req.app.conn.write.query({
        text: [
            'SELECT convert_bid($1, market_id, $2) oid',
            'FROM market',
            'WHERE base_currency_id || quote_currency_id = $3'
        ].join('\n'),
        values: [
            req.user.id,
            req.app.cache.parseCurrency(req.body.amount, quote),
            req.body.market
        ]
    }, function(err, dr) {
        if (err) {
            debug("spend error: %s", err.message);
            if (err.message.match(/non_negative_available/)) {
                return res.send(400, {
                    name: 'NoFunds',
                    message: 'Insufficient funds'
                })
            }

            if (err.message.match(/inserted with zero volume/)) {
                return res.send(400, {
                    name: 'AmountTooSmall',
                    message: 'Spend amount is too small'
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
