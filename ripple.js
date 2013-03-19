var Q = require('q')
, ripple = module.exports = {}

ripple.configure = function(app, conn) {
    app.post('/private/rippleout', ripple.withdraw.bind(ripple, conn))
    app.get('/ripple/address', ripple.address.bind(ripple, conn))
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
