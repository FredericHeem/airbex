var async = require('async')
, validate = require('./validate')
, vouchers = require('./vouchers')

module.exports = exports = function(app) {
    app.post('/v1/send', app.userAuth, exports.send)
}

exports.emailVoucher = function(app, fromUser, toEmail, amount, currency, cb)
{
    var voucherId = vouchers.createId()
    var sender

    async.series([
        // Find information about sender
        function(next) {
            app.conn.read.query({
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
            app.conn.write.query({
                text: 'SELECT create_voucher($1, $2, $3, $4)',
                values: [
                    voucherId,
                    fromUser,
                    currency,
                    app.cache.parseCurrency(amount, currency)
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
            // TODO: Allow user to change sending language
            app.email.send(toEmail, 'en-US', 'voucher-invite', {
                code: voucherId,
                currency: currencyFull,
                amount: amount,
                from: sender
            }, next)
        },

        // Log activity,
        function (next) {
            app.activity(fromUser, 'SendToUser', {
                to: toEmail,
                amount: amount,
                currency: currency
            })

            next()
        }
    ], cb)
}

exports.transfer = function(app, fromUser, toEmail, amount, currency, cb) {
    app.conn.write.query({
        text: [
            'SELECT',
            '   user_transfer_to_email($1, $2, $3, $4) tid,',
            '   su.email from_email,',
            '   ru.user_id to_user_id',
            'FROM "user" su, "user" ru',
            'WHERE su.user_id = $1 AND ru.email_lower = $2'
        ].join('\n'),
        values: [fromUser, toEmail, currency, app.cache.parseCurrency(amount, currency)]
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

        app.activity(fromUser, 'SendToUser', {
            to: toEmail,
            amount: amount,
            currency: currency
        })

        app.activity(row.to_user_id, 'ReceiveFromUser', {
            from:  row.from_email,
            amount: amount,
            currency: currency
        })

        cb()
    })
}

exports.send = function(req, res, next) {
    if (!validate(req.body, 'transfer', res)) return
    if (req.body.currency == 'NOK') throw new Error('Cannot transfer fiat')

    if (!req.apiKey.canWithdraw) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must have withdraw permission'
        })
    }

    exports.transfer(req.app, req.user, req.body.email,
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

            exports.emailVoucher(req.app.email, req.app.conn, req.app.cache, req.user,
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
