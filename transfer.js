var Q = require('q')
, activities = require('./activities')
, transfer = module.exports = {}

transfer.configure = function(app, conn, auth) {
    app.post('/transfer', auth, transfer.transfer.bind(transfer, conn))
}

transfer.transfer = function(conn, req, res, next) {
    conn.query({
        text: [
            'SELECT user_transfer_to_email($1, $2, $3, from_decimal($4, $3)) transaction_id, su.email sender_email, ru.email receiver_email,',
            'ru.user_id receiver_user_id',
            'FROM "user" su, "user" ru',
            'WHERE su.user_id = $1 AND ru.email_lower = $2'
        ].join('\n'),
        values: [req.user, req.body.email, req.body.currency_id, req.body.amount]
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
                    message: 'Insufficient funds'
                })
            }

            return next(err)
        }

        activities.log(conn, req.user, 'SendToUser', {
            to: req.body.email,
            amount: req.body.amount,
            currency: req.body.currency_id
        })

        activities.log(conn, dres.rows[0].receiver_user_id, 'ReceiveFomUser', {
            from:  dres.rows[0].sender_email,
            amount: req.body.amount,
            currency: req.body.currency_id
        })

        res.send(200, { id: dres.rows[0].transaction_id })
    })
}
