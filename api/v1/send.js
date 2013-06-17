var async = require('async')
, activities = require('./activities')
, validate = require('./validate')
, vouchers = require('./vouchers')
, format = require('util').format

exports.configure = function(app, conn, auth) {
    app.post('/v1/send', auth, exports.send.bind(exports, conn))
}

exports.sendToEmail = function(conn, req, res, next) {
    if (req.body.currency == 'NOK') return next(new Error('Cannot transfer NOK'))
    if (!validate(req.body, 'transfer', res)) return

    var voucherId = vouchers.createId()
    var sender

    async.series([
        // Find information about sender
        function(next) {
            conn.read.query({
                text: 'SELECT first_name, last_name, email FROM "user" WHERE user_id = $1',
                values: [req.user]
            }, function(err, dr) {
                if (err) return next(err)
                if (!dr.rowCount) return next(new Error(format('User %s not found', req.user)))
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
                    req.user,
                    req.body.currency,
                    req.app.cache.parseCurrency(req.body.amount, req.body.currency)
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

            if (req.body.currency == 'XRP') currencyFull = 'ripples (XRP)'
            else if (req.body.currency == 'BTC') currencyFull = 'Bitcoin (BTC)'
            else if (req.body.currency == 'LTC') currencyFull = 'Litecoin (LTC)'

            var mail = {
                from: 'Justcoin <hello@justcoin.com>',
                to: req.body.email,
                subject: format('%s has sent you %s %s on Justcoin', sender, req.body.amount, currencyFull),
                html: format([
                    '<p>Hi there,</p><p>%s has sent you %s %s on Justcoin, the digital currency exchange.</p>',
                    '<p>The transfer <b>is not complete</b> until you finish it with the link below:',
                    'the sender can cancel the transfer.</p>',
                    '<p>Claim now: <a href="%s">%s</a></p>',
                    '<p>Sincerely,<br />Justcoin | www.justcoin.com</p>'
                ].join('\n'), sender, +req.body.amount, currencyFull, url, url)
            }

            // TODO: Cancel voucher on failure
            req.app.smtp.sendMail(mail, next)
        },

        // Log activity,
        function (next) {
            activities.log(conn, req.user, 'SendToUser', {
                to: req.body.email,
                amount: req.body.amount,
                currency: req.body.currency
            })

            next()
        },

        // Result
        function() {
            res.send(204)
        }
    ], next)
}

exports.send = function(conn, req, res, next) {
    var email = req.body.email
    , emailRegex = /^\S+@\S+$/

    if (email.match(emailRegex)) {
        return exports.sendToEmail(conn, req, res, next)
    }

    next(new Error('Unable to interpret recipient ' + email))
}
