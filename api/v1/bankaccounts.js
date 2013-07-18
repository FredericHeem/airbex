var _ = require('lodash')
, validate = require('./validate')
, crypto = require('crypto')

module.exports = exports = function(app) {
    app.get('/v1/bankAccounts', app.auth.primary, exports.index)
    app.post('/v1/bankAccounts', app.auth.primary, exports.add)
    app.post('/v1/bankAccounts/:id/verify', app.auth.primary, exports.verify)
}

exports.createVerifyCode = function() {
    return crypto.randomBytes(2).toString('hex').toUpperCase()
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
                routingNumber: row.routing_number,
                verified: !!row.verified_at,
                verifying: !!row.verify_started_at
            })
        }))
    })
}

exports.add = function(req, res, next) {
    if (!validate(req.body, 'bankaccounts_add', res)) return

    req.app.conn.write.query({
        text: [
            'INSERT INTO bank_account (user_id, account_number, iban, swiftbic,',
            'routing_number, verify_code)',
            'VALUES ($1, $2, $3, $4, $5, $6)'
        ].join('\n'),
        values: [
            req.user,
            req.body.accountNumber,
            req.body.iban,
            req.body.swiftbic,
            req.body.routingNumber,
            exports.createVerifyCode()
        ]
    }, function(err) {
        if (err) return next(err)
        res.send(204)
    })
}

exports.verify = function(req, res, next) {
    req.app.conn.write.query({
        text: [
            'SELECT',
            '   verify_bank_account($1, $2, $3) success,',
            '   account_number, iban',
            'FROM bank_account',
            'WHERE bank_account_id = $2'
        ].join('\n'),
        values: [
            req.user,
            +req.params.id,
            req.body.code
        ]
    }, function(err, dr) {
        if (err) return next(err)
        var row = dr.rows[0]
        if (!row) {
            return res.send(404, {
                name: 'BankAccountNotFound',
                message: 'Bank account not found'
            })
        }

        if (!row.success) {
            return res.send(400, {
                name: 'WrongBankVerifyCode',
                message: 'Bank account verification failed. Wrong code.'
            })
        }

        req.app.activity(req.user, 'VerifyBankAccount', {
            accountNumber: row.account_number,
            iban: row.iban
        })

        res.send(204)
    })
}
