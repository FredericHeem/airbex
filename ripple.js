var Q = require('q')
, activities = require('./activities')
, ripple = module.exports = {}

ripple.configure = function(app, conn, auth) {
    app.post('/ripple/out', auth, ripple.withdraw.bind(ripple, conn))
    app.get('/ripple/address', ripple.address.bind(ripple, conn))
    app.get('/ripple/federation', ripple.federation.bind(ripple, app.config, conn))
}

ripple.federation = function(config, conn, req, res, next) {
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
        console.log(config)
    if (domain !== config.ripple_federation.domain) return sendError('noSuchDomain')

    var query = user ? {
        text: 'SELECT user_id FROM "user" WHERE REPLACE(email_lower, \'@\', \'_\') = $1',
        values: [user]
    } : {
        text: 'SELECT REPLACE(email_lower, \'@\', \'_\') username FROM "user" WHERE user_id = $1',
        values: [tag]
    }

    Q.ninvoke(conn, 'query', query)
    .then(function(dres) {
        if (!dres.rows.length) return sendError(user ? 'noSuchUser' : 'noSuchTag')
        var result = {
            result: 'success',
            federation_json: {
                type: 'federation_record',
                currencies: config.ripple_federation_currencies,
                expires: Math.round(+new Date / 1e3) + 3600 * 24 * 7,
                domain: config.ripple_federation.domain,
                signer: null
            },
            public_key: null,
            signature: null
        }
        if (user) result.federation_json.tag = dres.rows[0].user_id
        else result.federation_json.user = dres.rows[0].username
        res.send(result)
    }, function(err) {
        console.error(err)
        sendError('unavailable')
    })
    .done()
}

ripple.address = function(conn, req, res, next) {
    conn.query({
        text: 'SELECT address FROM ripple_account'
    }, function(err, dres) {
        if (err) return next(err)
        if (!dres.rows.length) {
            console.error('Ripple account missing from database')
            return res.send(500)
        }
        res.send({ address: dres.rows[0].address })
    })
}

ripple.withdraw = function(conn, req, res, next) {
    Q.ninvoke(conn, 'query', {
        text: 'SELECT ripple_withdraw(user_currency_account($1, $2), $3, from_decimal($4, $2))',
        values: [req.user, req.body.currencyId, req.body.address, req.body.amount]
    })
    .then(function(cres) {
        activities.log(conn, req.user, 'RippleWithdraw', {
            address: req.body.address,
            amount: req.body.amount,
            currency: req.body.currencyId
        })
        res.send(201, { request_id: cres.rows[0].request_id })
    }, function(err) {
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

        next(err)
    })
    .done()
}
