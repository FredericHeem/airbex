var debug = require('debug')('snow:v1:ripple')
, num = require('num')

module.exports = exports = function(app) {
    var demand = app.security.demand
    app.post('/v1/ripple/out', demand.otp(demand.withdraw(3), true), exports.withdraw)
    app.get('/v1/ripple/address', exports.address)
    app.get('/v1/ripple/trust/:account', exports.trust)
    app.get('/v1/ripple/account/:account', exports.account)
    require('./ripple.federation')(app)
    require('./ripple.bitcoinbridge')(app)
}

exports.address = function(req, res) {
    res.send({ address: req.app.config.ripple_account })
}

exports.withdraw = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/ripple_out', res)) return

    if (req.body.address == req.app.config.ripple_account) {
        return res.send(400, {
            name: 'CannotSendToSelf',
            message: 'Cannot send Ripple payment to oneself'
        })
    }

    var queryText = [
        'SELECT ripple_withdraw(user_currency_account($1, $2), $3, $4) rid'
    ].join('\n')

    req.app.conn.write.query({
        text: queryText,
        values: [
            req.user.id,
            req.body.currency,
            req.body.address,
            req.app.cache.parseCurrency(req.body.amount, req.body.currency)
        ]
    }, function(err, dr) {
        if (err) {
            if (err.message.match(/transaction_amount_check/)) {
                return res.send(400, {
                    name: 'InvalidAmount',
                    message: 'The requested transfer amount is invalid/out of range'
                })
            }

            if (err.message.match(/non_negative_available/)) {
                return res.send(400, {
                    name: 'InsufficientFunds',
                    message: 'Insufficient funds'
                })
            }

            return next(err)
        }

        req.app.activity(req.user.id, 'RippleWithdraw', {
            address: req.body.address,
            amount: req.body.amount,
            currency: req.body.currency
        })

        res.send(201, { id: dr.rows[0].rid })
    })
}

exports.account = function(req, res, next) {
    if (!req.app.ripple) {
        return next(new Error('Ripple is disabled'))
    }

    req.app.ripple.remote.request_account_info(req.params.account, function(err, account) {
        if (err) {
            if (err.remote && err.remote.error == 'actNotFound') {
                return res.send(404, {
                    name: 'AccountNotFound',
                    message: 'The specified account was not found'
                })
            }

            debug('error name: %s', err.name || '<none>')
            return next(err)
        }

        res.send({
            balance: num(account.account_data.Balance, 6).toString()
        })
    })
}

exports.trust = function(req, res, next) {
    if (!req.app.config.ripple_account) {
        return next(new Error('ripple_account not configured'))
    }

    if (!req.app.ripple) {
        return next(new Error('Ripple is disabled'))
    }

    req.app.ripple.remote.request_account_lines(req.params.account, 0, 'current', function(err, rres) {
        if (err) {
            if (err.remote && err.remote.error == 'actNotFound') {
                return res.send(404, {
                    name: 'AccountNotFound',
                    message: 'The specified account was not found'
                })
            }

            debug('error name: %s', err.name || '<none>')
            return next(err)
        }

        var lines = rres.lines.reduce(function(p, c) {
            if (c.account != req.app.config.ripple_account) return p

            p[c.currency] = {
                limit: c.limit,
                balance: c.balance
            }

            return p
        }, {})

        res.send(lines)
    })
}
