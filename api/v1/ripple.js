module.exports = exports = function(app) {
    app.post('/v1/ripple/out', app.auth.withdraw(2), exports.withdraw)
    app.get('/v1/ripple/address', exports.address)
    app.get('/ripple/federation', exports.federation)
    app.get('/v1/ripple/trust/:account', exports.trust)
}

exports.federation = function(conn, req, res) {
    var domain = req.query.domain
    , tag = req.query.tag
    , user = req.query.user
    , errorMessages = {
        'noSuchUser': 'The supplied user was not found.',
        'noSuchTag': 'The supplied tag was not found.',
        'noSuchDomain': 'The supplied domain is not served here.',
        'invalidParams': 'Missing or conflicting parameters.',
        'unavailable': 'Service is temporarily unavailable.'
    }

    var sendError = function(name) {
        res.send({
            result: 'error',
            error: name,
            error_message: errorMessages[name],
            request: req.query
        })
    }

    if (!domain) return sendError('invalidParams')
    if (!user && !tag) return sendError('invalidParams')
    if (user && tag) return sendError('invalidParams')
    if (domain !== req.app.config.ripple_federation.domain) {
        return sendError('noSuchDomain')
    }

    var query = user ? {
        text: 'SELECT user_id FROM "user" WHERE REPLACE(email_lower, \'@\', \'_\') = $1',
        values: [user]
    } : {
        text: [
            'SELECT REPLACE(email_lower, \'@\', \'_\') username',
            'FROM "user" WHERE tag = $1'
        ].join('\n'),
        values: [tag]
    }

    req.app.conn.read.query(query, function(err, dr) {
        if (err) {
            console.error(err)
            return sendError('unavailable')
        }

        if (!dr.rows.length) {
            return sendError(user ? 'noSuchUser' : 'noSuchTag')
        }

        var result = {
            result: 'success',
            federation_json: {
                type: 'federation_record',
                currencies: req.app.config.ripple_federation_currencies,
                expires: Math.round(+new Date() / 1e3) + 3600 * 24 * 7,
                domain: req.app.config.ripple_federation.domain,
                signer: null
            },
            public_key: null,
            signature: null
        }
        var row = dr.rows[0]
        if (user) result.federation_json.tag = row.user_id
        else result.federation_json.user = row.username
        res.send(result)
    })
}

exports.address = function(req, res) {
    res.send({ address: req.app.config.ripple_account })
}

exports.withdraw = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/ripple_out', res)) return

    var queryText = [
        'SELECT ripple_withdraw(user_currency_account($1, $2), $3, $4) rid'
    ].join('\n')

    req.app.conn.write.query({
        text: queryText,
        values: [
            req.user,
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

        req.app.activity(req.user, 'RippleWithdraw', {
            address: req.body.address,
            amount: req.body.amount,
            currency: req.body.currency
        })

        res.send(201, { id: dr.rows[0].rid })
    })
}

exports.trust = function(req, res, next) {
    if (!req.app.config.ripple_account) {
        throw new Error('ripple_account not configured')
    }

    req.app.ripple.drop.lines(req.params.account, function(err, lines) {
        if (err) return next(err)

        lines = lines.reduce(function(p, c) {
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
