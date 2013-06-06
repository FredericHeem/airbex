var _ = require('lodash')
, validate = require('./validate')
, activities = require('./activities')
, simple = module.exports = {}

simple.configure = function(app, conn, auth) {
    app.post('/v1/simple/convertAndWithdraw', auth, simple.convertAndWithdraw.bind(simple, conn))
}

simple.convertAndWithdraw = function(conn, req, res, next) {
    if (!validate(req.body, 'convertAndWithdraw', res)) return

    var values = [
        req.user,
        +req.body.bankAccount,
        req.app.cache.parseOrderVolume(req.body.amount, 'BTC' + req.body.currency),
        'BTC',
        req.body.currency
    ]

    console.log(values)

    conn.write.query({
        text: [
            'SELECT convert_and_withdraw($1, $2, $3, $4, $5)'
        ].join('\n'),
        values: values
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
            return res.send(400, {
                name: 'BankAccountNotFound',
                message: 'Bank account not found for this user'
            })
        }

        return res.send(204)
    })
}
