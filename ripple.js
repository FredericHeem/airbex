var Q = require('q')
, ripple = module.exports = {}

ripple.configure = function(app, conn) {
    app.post('/private/rippleout', ripple.withdraw.bind(ripple, conn))
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
                currencies: config.ripple_federation_currencies,
                expires: Math.round(+new Date / 1e3) + 3600, // TODO: timezone?
                domain: config.ripple_federation.domain,
                signer: config.ripple_account // TODO: what's this?
            },
            federation_blob: null // TODO
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
        res.send({ address: dres.rows[0].address })
    })
}

ripple.getUserSecurityAccount = function(conn, userId, securityId) {
    return Q.ninvoke(conn, 'query', {
        text: 'SELECT user_security_account($1, $2)',
        values: [userId, securityId]
    })
    .get('rows').get(0).get('user_security_account')
}

ripple.withdraw = function(conn, req, res, next) {
    ripple.getUserSecurityAccount(conn, req.security.userId, req.body.securityId)
    .then(function(accountId) {
        return Q.ninvoke(conn, 'query', {
            text: 'SELECT ripple_withdraw($1, $2, $3)',
            values: [accountId, req.body.address, req.body.amount]
        })
        .then(function(cres) {
            res.send(201, { request_id: cres.rows[0].request_id })
        }, next)
    }, next)
}
