var validate = require('./validate')
, async = require('async')
, simple = module.exports = {}

simple.configure = function(app, conn, auth) {
    app.post('/v1/simple/convertAndWithdraw', auth,
        simple.convertAndWithdraw.bind(simple, conn))
}

simple.convertAndWithdraw = function(conn, req, res, next) {
    if (!validate(req.body, 'convertAndWithdraw', res)) return

    if (!req.apiKey.primary) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must be primary api key'
        })
    }

    async.waterfall([
        function(next) {
            conn.write.query({
                text: [
                    'SELECT convert_and_withdraw($1, $2, market_id, $3) wrid',
                    'FROM market',
                    'WHERE',
                    '   base_currency_id = \'BTC\' AND',
                    '   quote_currency_id = $4'
                ].join('\n'),
                values: [
                    req.user,
                    +req.body.bankAccount,
                    req.app.cache.parseOrderVolume(req.body.amount,
                        'BTC' + req.body.currency),
                    req.body.currency
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
                    return next(new Error('Market not found'))
                }

                next(null, dr.rows[0].wrid)
            })
        },

        function(wrid, next) {
            conn.read.query({
                text: [
                    'SELECT amount',
                    'FROM withdraw_request',
                    'WHERE request_id = $1'
                ].join('\n'),
                values: [wrid]
            }, function(err, dr) {
                if (err) return next(err)

                if (!dr.rowCount) {
                    return next('Withdraw request ' + wrid + ' not found')
                }

                var amount = req.app.cache.formatCurrency(
                    dr.rows[0].amount, req.body.currency)

                return res.send(200, {
                    amount:  amount
                })
            })
        }
    ], next)
}
