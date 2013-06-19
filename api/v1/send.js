var async = require('async')
,
    activities = require('./activities')
, validate = require('./validate')
, vouchers = require('./vouchers')
, format = require('util').format

exports.configure = function(app, conn, auth) {
    app.post('/v1/send', auth, exports.send.bind(exports, conn))
}

exports.emailVoucher = function(smtp, conn, cache, fromUser, toEmail, amount, currency, cb) {
    var voucherId = vouchers.createId()
    var sender

    async.series([
        // Find information about sender
        function(next) {
            conn.read.query({
                text: 'SELECT first_name, last_name, email FROM "user" WHERE user_id = $1',
                values: [fromUser]
            }, function(err, dr) {
                if (err) return next(err)
                var row = dr.rows[0]
                sender = row.first_name + ' ' + row.last_name + ' (' + row.email + ')'
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
            var baseUrl = process.env.NODE_ENV == 'production' ?
                'https://justcoin.com' : process.env.NODE_ENV == 'staging' ?
                'https://staging.justcoin.com' : 'http://localhost:5073'

            var url = baseUrl + '/client/#' + voucherId

            var currencyFull

            if (currency == 'XRP') currencyFull = 'ripples (XRP)'
            else if (currency == 'BTC') currencyFull = 'Bitcoin (BTC)'
            else if (currency == 'LTC') currencyFull = 'Litecoin (LTC)'
            else throw new Error('Unexpected currency ' + currency)

            var mail = {
                from: 'Justcoin <hello@justcoin.com>',
                to: toEmail,
                subject: format('%s has sent you %s %s on Justcoin', sender, amount, currencyFull),
                html: format([
                    '<p>Hi there,</p><p>%s has sent you %s %s on Justcoin,',
                    'the digital currency exchange.</p>',
                    '<p>The transfer <b>is not complete</b> until you',
                    'finish it with the link below:',
                    'the sender can cancel the transfer.</p>',
                    '<p>Claim now: <a href="%s">%s</a></p>',
                    '<p>Sincerely,<br />Justcoin | www.justcoin.com</p>'
                ].join('\n'), sender, amount, currencyFull, url, url)
            }

            // TODO: Cancel voucher on failure
            smtp.sendMail(mail, next)
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

            exports.emailVoucher(req.app.smtp, conn,req.app.cache, req.user,
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
