var Q = require('q')
, transfer = module.exports = {}

transfer.configure = function(app, conn, securityId) {
    app.post('/transfer', transfer.transfer.bind(transfer, conn))
}

transfer.transfer = function(conn, req, res, next) {
    conn.query({
        text: 'SELECT user_transfer_to_email($1, $2, $3, from_decimal($4, $3)) transaction_id',
        values: [req.security.userId, req.body.email, req.body.security_id, req.body.amount]
    }, function(err, dres) {
        if (err) {
            if (err.message.match(/^User with email/)) {
                return res.send(400, {
                    name: 'UserNotFound',
                    message: 'The user ' + req.body.email + ' does not exist'
                })
            }

            if (err.message == 'new row for relation "transaction" violates check constraint "transaction_debit_credit_not_same"') {
                return res.send(400, {
                    name: 'CannotTransferToSelf',
                    message: 'Cannot transfer to yourself'
                })
            }

            if (err.message == 'new row for relation "transaction" violates check constraint "transaction_amount_check"') {
                return res.send(400, {
                    name: 'InvalidAmount',
                    message: 'The requested transfer amount is invalid/out of range'
                })
            }

            if (err.message == 'new row for relation "account" violates check constraint "non_negative_available"') {
                return res.send(400, {
                    name: 'InsufficientFunds',
                    message: 'Source account cannot fund the transfer'
                })
            }

            return next(err)
        }

        res.send({ transaction_id: dres.rows[0].transaction_id })
    })
}
