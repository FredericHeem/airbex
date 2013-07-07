var Q = require('q')
, activities = require('./activities')
, validate = require('./validate')
, Drop = require('drop')
, debug = require('debug')('snow:ripple')
, ripple = module.exports = {}

ripple.configure = function(app, conn, auth) {
    app.post('/v1/ripple/out', auth, ripple.withdraw.bind(ripple, conn))
    app.get('/v1/ripple/address', ripple.address.bind(ripple, conn))
    app.get('/ripple/federation', ripple.federation.bind(ripple, app.config, conn))
    app.get('/v1/ripple/trust/:account', ripple.trust.bind(ripple, app.config, conn))

    ripple.connect()
}

ripple.connect = function() {
    debug('connecting to ripple...')

    ripple.drop = new Drop(function() {
        debug('connected to ripple')
    })

    ripple.drop.on('close', function() {
        debug('disconnected from ripple. reconnecting in 10 sec')
        setTimeout(ripple.connect, 10e3)
    })
}

ripple.federation = function(config, conn, req, res) {
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
    if (domain !== config.ripple_federation.domain) return sendError('noSuchDomain')

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

    Q.ninvoke(conn.read, 'query', query)
    .then(function(dres) {
        if (!dres.rows.length) return sendError(user ? 'noSuchUser' : 'noSuchTag')
        var result = {
            result: 'success',
            federation_json: {
                type: 'federation_record',
                currencies: config.ripple_federation_currencies,
                expires: Math.round(+new Date() / 1e3) + 3600 * 24 * 7,
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
    conn.read.query({
        text: 'SELECT address FROM ripple_account'
    }, function(err, dres) {
        if (err) return next(err)
        if (!dres.rows.length) {
            console.error('Ripple account missing from database')
            return res.send(500)
        }
        res.send(200, { address: dres.rows[0].address })
    })
}

ripple.withdraw = function(conn, req, res, next) {
    if (!validate(req.body, 'ripple_out', res)) return

    if (!req.apiKey.canWithdraw) {
        return res.send(401, {
            name: 'MissingApiKeyPermission',
            message: 'Must have withdraw permission'
        })
    }

    var queryText = [
        'SELECT ripple_withdraw(user_currency_account($1, $2), $3, $4) rid'
    ].join('\n')

    Q.ninvoke(conn.write, 'query', {
        text: queryText,
        values: [
            req.user,
            req.body.currency,
            req.body.address,
            req.app.cache.parseCurrency(req.body.amount, req.body.currency)
        ]
    })
    .then(function(cres) {
        activities.log(conn, req.user, 'RippleWithdraw', {
            address: req.body.address,
            amount: req.body.amount,
            currency: req.body.currency
        })
        res.send(201, { id: cres.rows[0].rid })
    }, function(err) {
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

        next(err)
    })
    .done()
}

ripple.trust = function(config, conn, req, res, next) {
    if (!config.ripple_account) {
        throw new Error('ripple_account not configured')
    }

    ripple.drop.lines(req.params.account, function(err, lines) {
        if (err) return next(err)

        lines = lines.reduce(function(p, c) {
            if (c.account != config.ripple_account) return p

            p[c.currency] = {
                limit: c.limit,
                balance: c.balance
            }

            return p
        }, {})

        res.send(lines)
    })
}
