var _ = require('lodash')

module.exports = exports = function(app) {
    app.get('/v1/bankAccounts', app.auth.primary, exports.index)
    app.post('/v1/bankAccounts', app.auth.primary(4), exports.add)
}

exports.index = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT * FROM bank_account WHERE user_id = $1'
        ].join('\n'),
        values: [req.user]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(200, dr.rows.map(function(row) {
            return _.extend(_.pick(row, 'iban', 'swiftbic'), {
                id: row.bank_account_id,
                displayName: row.display_name,
                accountNumber: row.account_number,
                iban: row.iban,
                routingNumber: row.routing_number
            })
        }))
    })
}

exports.add = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/bankaccounts_add', res)) return

    req.app.conn.write.query({
        text: [
            'INSERT INTO bank_account (user_id, account_number, iban, swiftbic, routing_number)',
            'VALUES ($1, $2, $3, $4, $5)'
        ].join('\n'),
        values: [
            req.user,
            req.body.accountNumber,
            req.body.iban,
            req.body.swiftbic,
            req.body.routingNumber
        ]
    }, function(err) {
        if (err) return next(err)
        res.send(204)
    })
}
