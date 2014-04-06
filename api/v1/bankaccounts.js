var _ = require('lodash')

module.exports = exports = function(app) {
    app.get('/v1/bankAccounts', app.security.demand.primary, exports.index)
    app.post('/v1/bankAccounts', app.security.demand.primary(3), exports.add)
}

exports.index = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT * FROM bank_account WHERE user_id = $1'
        ].join('\n'),
        values: [req.user.id]
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

    var q = {
        text: [
            'INSERT INTO bank_account (user_id, account_number, iban, swiftbic, routing_number, display_name)',
            'VALUES ($1, $2, $3, $4, $5, $6)'
        ].join('\n'),
        values: [
            req.user.id,
            req.body.accountNumber,
            req.body.iban,
            req.body.swiftbic,
            req.body.routingNumber,
            req.body.displayName
        ]
    }

    req.app.conn.write.query(q, function(err) {
        if (err) return next(err)
        res.send(204)
    })
}
