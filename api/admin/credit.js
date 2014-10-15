var log = require('../log')(__filename)
, debug = log.debug

module.exports = exports = function(app) {
    app.post('/admin/bankCredits', app.security.demand.admin, exports.createBankCredit)
    app.get('/admin/bankCredits', app.security.demand.admin, exports.getBankCredits)
    app.post('/admin/bankCredits/:id/approve', app.security.demand.admin, exports.approveBankCredit)
    app.post('/admin/bankCredits/:id/cancel', app.security.demand.admin, exports.cancelBankCredit)
}

exports.getBankCredits = function(req, res, next) {
    var query = [
        'SELECT',
        '   bc.*,',
        '   u.first_name || \' \' || last_name user_name,',
        '   u.tag user_tag',
        'FROM bank_credit bc',
        'INNER JOIN "user" u ON u.user_id = bc.user_id',
        'WHERE state = \'review\'',
        'ORDER BY bc.bank_credit_id DESC'
    ].join('\n')

    req.app.conn.read.get().query(query, function(err, dr) {
        if (err) return next(err)

        res.send(dr.rows.map(function(row) {
            return {
                id: row.bank_credit_id,
                userId: row.user_id,
                userName: row.user_name,
                userTag: row.user_tag,
                amount: req.app.cache.formatCurrency(row.amount, row.currency_id),
                currency: row.currency_id,
                createdAt: row.created_at
            }
        }))
    })
}

exports.createBankCredit = function(req, res, next) {
	debug("createBankCredit %s", JSON.stringify(req.body))
    var query = {
        text: [
            'INSERT INTO bank_credit (user_id, currency_id, amount, reference, purchase_order_id)',
            'VALUES ($1, $2, $3, $4, $5)',
            'RETURNING bank_credit_id'
        ].join('\n'),
        values: [
            req.body.user_id,
            req.body.currency_id,
            req.app.cache.parseCurrency(req.body.amount, req.body.currency_id),
            req.body.reference,
            req.body.purchase_order_id || 0
        ]
    }

    req.app.conn.write.get().query(query, function(err, dr) {
        if (err) return next(err)

        // Log for admin
        var bank_credit_id = dr.rows[0].bank_credit_id;
        req.body.bank_credit_id = bank_credit_id;
        req.app.activity(req.user.id, 'AdminAddBankCredit', req.body)

        res.status(201).send({ id: bank_credit_id })

    })
}

exports.approveBankCredit = function(req, res, next) {
	debug("approveBankCredit %s", req.params.id)
    var query = {
        text: [
            'UPDATE bank_credit',
            'SET state = \'approved\'',
            'WHERE bank_credit_id = $1',
            'RETURNING transaction_id, user_id, currency_id, amount'
        ].join('\n'),
        values: [
            +req.params.id
        ]
    }

    req.app.conn.write.get().query(query, function(err, dr) {
        if (err) return next(err)

        var row = dr.rows[0]

        if (!dr.rowCount) {
            return res.status(404).send({
                name: 'BankCreditNotFound',
                message: 'The specified bank credit was not found or is not under review'
            })
        }

        // Log for admin
        req.app.activity(req.user.id, 'AdminApproveBankCredit', {
            id: +req.params.id
        })


        // Log segment activity
//        req.app.segment.track({
//            userId: row.user_id.toString(),
//            event: 'Bank credited',
//            properties: {
//                currency: row.currency_id,
//                amount: req.app.cache.formatCurrency(row.amount, row.currency_id)
//            }
//        })
        res.send(201, { id: dr.rows[0].transaction_id })
    })
}

exports.cancelBankCredit = function(req, res, next) {
    var query = {
        text: [
            'UPDATE bank_credit',
            'SET state = \'canceled\'',
            'WHERE bank_credit_id = $1'
        ].join('\n'),
        values: [
            +req.params.id
        ]
    }

    req.app.conn.write.get().query(query, function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) {
            return res.status(404).send({
                name: 'BankCreditNotFound',
                message: 'The specified bank credit was not found or is not under review'
            })
        }

        // Log for admin
        req.app.activity(req.user.id, 'AdminCancelBankCredit', {
            id: +req.params.id
        })

        res.status(204).end()
    })
}
