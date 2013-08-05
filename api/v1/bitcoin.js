var util = require('util')

module.exports = exports = function(app, currencyId) {
    app.post('/v1/' + currencyId + '/out', app.auth.withdraw(2),
        exports.withdraw.bind(exports, currencyId))
    app.get('/v1/' + currencyId + '/address', app.auth.deposit,
        exports.address.bind(exports, currencyId))
}

exports.withdraw = function(currencyId, req, res, next) {
    if (!req.app.validate(req.body, 'v1/' + currencyId.toLowerCase() + '_out', res)) {
        return
    }

    console.log('processing withdraw request of %d %s from user #%s to %s',
        req.body.amount, currencyId, req.user, req.body.address)

    var queryText = util.format(
        'SELECT %s_withdraw($1, $2, $3) rid',
        currencyId)

    req.app.conn.write.query({
        text: queryText,
        values: [
            req.user,
            req.body.address,
            req.app.cache.parseCurrency(req.body.amount, currencyId)
        ]
    }, function(err, dr) {
        if (err) {
            if (err.message.match(/non_negative_available/)) {
                return res.send(500, {
                    name: 'NoFunds',
                    message: 'insufficient funds'
                })
            }

            return next(err)
        }

        req.app.activity(req.user, currencyId + 'Withdraw', {
            address: req.body.address,
            amount: req.body.amount
        })

        res.send(201, { id: dr.rows[0].rid })
    })
}

exports.address = function(currencyId, req, res, next) {
    var queryText = util.format([
        'SELECT address',
        'FROM %s_deposit_address',
        'WHERE account_id = user_currency_account($1, $2)'
    ].join('\n'), currencyId)

    req.app.conn.read.query({
        text: queryText,
        values: [req.user, currencyId]
    }, function(err, dr) {
        if (err) return next(err)
        var address = dr.rows.length ? dr.rows[0].address : null
        res.send(200, { address: address })
    })
}
