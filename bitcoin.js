var Q = require('q')
, _ = require('underscore')
, util = require('util')
, bitcoin = module.exports = {}
, auth = require('./auth')

bitcoin.configure = function(app, conn, auth, securityId) {
    app.post('/withdraw/' + securityId, auth, bitcoin.withdraw.bind(bitcoin, conn, securityId))
    app.get('/deposit/' + securityId + '/address', auth, bitcoin.address.bind(bitcoin, conn, securityId))
}

bitcoin.withdraw = function(conn, securityId, req, res, next) {
    console.log('processing withdraw request of %d %s from user #%s to %s',
        req.body.amount, securityId, req.user, req.body.address)

    Q.ninvoke(conn, 'query', {
        text: 'SELECT ' + securityId + '_withdraw ($1, $2, from_decimal($3, $4)) request_id',
        values: [req.user, req.body.address, req.body.amount, securityId]
    })
    .then(function(cres) {
        res.send(201, { request_id: cres.rows[0].request_id })
    }, function(err) {
        if (err.code === '23514' && err.message.match(/non_negative_available/)) {
            return res.send(500, {
                code: 'ENOFUNDS',
                message: 'insufficient funds available in source account'
            })
        }

        if (err.code === 'EINVALIDADDRESS') {
            return res.send(500, _.pick(err, 'code', 'message'))
        }

        next(err)
    }, next)
    .done()
}

bitcoin.address = function(conn, securityId, req, res, next) {
    Q.ninvoke(conn, 'query', {
        text: util.format(
            'SELECT address FROM %s_deposit_address WHERE account_id = user_security_account($1, $2)',
            securityId),
        values: [req.user, securityId]
    })
    .then(function(cres) {
        var address = cres.rows.length ? cres.rows[0].address : null
        res.send({ address: address })
    }, next)
    .done()
}
