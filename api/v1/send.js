var async = require('async')
, vouchers = require('./vouchers')

module.exports = exports = function(app) {
    app.post('/v1/send', app.auth.withdraw, exports.send)
}

exports.sendToEmail = function(app, from, to, currency, amount, allowNew, cb) {
    exports.sendToExistingUser(app, from, to, currency, amount,
        function(err) {
            if (!err) return cb()
            if (err.name == 'UserNotFound') {
                if (!allowNew) return cb(err)
                exports.sendVoucher(app, from, to, currency, amount, cb)
            }
            cb(err)
        }
    )
}

exports.friendlyCurrency = function(currency) {
    var currencyFull = currency
    if (currency == 'XRP') currencyFull = 'ripples (XRP)'
    else if (currency == 'BTC') currencyFull = 'Bitcoin (BTC)'
    else if (currency == 'LTC') currencyFull = 'Litecoin (LTC)'
    return currencyFull
}

exports.sendToExistingUser = function(app, from, to, currency, amount, cb) {
    app.conn.write.query({
        text: [
            'SELECT',
            '   user_transfer_to_email($1, $2, $3, $4) tid,',
            '   su.email from_email,',
            '   ru.user_id to_user_id',
            'FROM "user" su, "user" ru',
            'WHERE su.user_id = $1 AND ru.email_lower = $2'
        ].join('\n'),
        values: [
            from,
            to,
            currency,
            app.cache.parseCurrency(amount, currency)
        ]
    }, function(err, dr) {
        if (err) return cb(err)

        var row = dr.rows[0]

        if (!row) {
            err = new Error('User not found')
            err.name = 'UserNotFound'
            return cb(err)
        }

        app.activity(from, 'SendToUser', {
            to: to,
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

exports.sendVoucher = function(app, fromUser, toEmail, amount, currency, cb)
{
    var voucherId = vouchers.createId()
    var sender

    async.series([
        // Create voucher
        function(cb) {
            vouchers.create(app, fromUser, currency, amount, function(err, res) {
                if (err) return cb(err)
                voucherId = res
                cb()
            })
        },

        // Find information about sender
        function(voucher, next) {
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

        // Send email
        function(next) {
            var currencyFull = exports.friendlyCurrency(currency)

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

exports.send = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/transfer', res)) return

    if (req.body.currency == 'NOK') {
        return res.send(400, {
            name: 'CannotSendFiat',
            message: 'Cannot send FIAT to other users at this time'
        })
    }

    exports.sendToEmail(req.app, req.user, req.body.email,
        req.body.currency, req.body.amount, req.body.allowNewUser,
        function(err) {
            if (!err) return res.send(204)

            if (err.name != 'UserNotFound') {
                return res.send(400, {
                    name: 'UserNotFound',
                    message: 'User not found'
                })
            }

            next(err)
        }
    )
}
