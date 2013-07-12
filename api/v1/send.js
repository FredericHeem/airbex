var async = require('async')
, activities = require('./activities')
, validate = require('./validate')
, vouchers = require('./vouchers')

exports.configure = function(app, conn, auth) {
    app.post('/v1/send', auth, exports.send.bind(exports, conn))
}

exports.emailVoucher = function(emailer, conn, cache, fromUser, toEmail,
    amount, currency, cb)
{
    var voucherId = vouchers.createId()
    var sender

    async.series([
        // Find information about sender
        function(next) {
            conn.read.query({
                text: [
                    'SELECT first_name, last_name, email',
                    'FROM "user"',
                    'WHERE user_id = $1'
                ].join('\n'),
                values: [fromUser]
            }, function(err, dr) {
                if (err) return next(err)
                var row = dr.rows[0]
                sender = row.first_name ?
                    row.first_name + ' ' + row.last_name + ' (' + row.email + ')' :
                    row.email
                next()
            })
        },

        // Create voucher
        function(next) {
            conn.write.query({
                text: 'SELECT create_voucher($1, $2, $3, $4)',
                values: [
                    voucherId,
                    fromUser,
                    currency,
                    cache.parseCurrency(amount, currency)
                ]
            }, next)
        },

        // Send email
        function(next) {
            var currencyFull = currency
            if (currency == 'XRP') currencyFull = 'ripples (XRP)'
            else if (currency == 'BTC') currencyFull = 'Bitcoin (BTC)'
            else if (currency == 'LTC') currencyFull = 'Litecoin (LTC)'

            // TODO: Cancel voucher on failure
            emailer.send(toEmail, 'voucher-invite', {
                code: voucherId,
                currency: currencyFull,
                amount: cache.parseCurrency(amount, currency),
                from: sender
            }, next)
        },

        // Log activity,
        function (next) {
            activities.log(conn, fromUser, 'SendToUser', {
                to: toEmail,
                amount: amount,
                currency: currency
            })

            next()
        }
    ], cb)
}

exports.transfer = function(conn, cache, fromUser, toEmail, amount, currency, cb) {
    conn.write.query({
        text: [
            'SELECT',
            '   user_transfer_to_email($1, $2, $3, $4) tid,',
            '   su.email fromEmail,',
            '   ru.email toEmail,',
            '   ru.user_id toUserId',
            'FROM "user" su, "user" ru',
            'WHERE su.user_id = $1 AND ru.email_lower = $2'
        ].join('\n'),
        values: [fromUser, toEmail, currency, cache.parseCurrency(amount, currency)]
    }, function(err, dr) {
        if (err) {
            if (err.message.match(/^User with email/)) {
                err = new Error('The user ' + toEmail + ' does not exist')
                err.friendly = true
                return cb(err)
            }

            if (err.message.match(/transaction_debit_credit_not_same/)) {
                err = new Error('Cannot transfer to yourself')
                err.name = 'CannotTransferToSelf'
                err.friendly = true
                return cb(err)
            }

            if (err.message.match(/transaction_amount_check/)) {
                err = new Error('The requested transfer amount is invalid/out of range')
                err.name = 'InvalidAmount'
                err.friendly = true
                return cb(err)
            }

            if (err.message.match(/non_negative_available/)) {
                err = new Error('Insufficient funds')
                err.name = 'InsufficientFunds'
                err.friendly = true
                return cb(err)
            }

            return cb(err)
        }

        var row = dr.rows[0]

        if (!row) {
            err = new Error('User not found')
            err.friendly = true
            err.name = 'UserNotFound'
            return cb(err)
        }

        activities.log(conn, fromUser, 'SendToUser', {
            to: toEmail,
            amount: amount,
            currency: currency
        })

        activities.log(conn, row.toUserId, 'ReceiveFomUser', {
            from:  row.fromEmail,
            amount: amount,
            currency: currency
        })

        cb()
    })
}

exports.send = function(conn, req, res, next) {
    if (!validate(req.body, 'transfer', res)) return
    if (req.body.currency == 'NOK') throw new Error('Cannot transfer fiat')

    if (!req.apiKey.canWithdraw) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must have withdraw permission'
        })
    }

    exports.transfer(conn, req.app.cache, req.user, req.body.email,
        req.body.amount, req.body.currency, function(err) {
            if (!err) return res.send(204)

            if (err.name != 'UserNotFound' || !req.body.allowNewUser) {
                if (err.friendly) {
                    return res.send(400, {
                        name: err.name,
                        message: err.message
                    })
                }

                return next(err)
            }

            exports.emailVoucher(req.app.email, conn,req.app.cache, req.user,
                req.body.email, req.body.amount, req.body.currency,
                function(err, voucher) {
                    if (!err) {
                        return res.send(200, { voucher: voucher })
                    }

                    if (err.friendly) {
                        return res.send(400, {
                            name: err.name,
                            message: err.message
                        })
                    }

                    return next(err)
                }
            )
        }
    )
}
