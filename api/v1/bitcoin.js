var Q = require('q')
, activities = require('./activities')
, _ = require('underscore')
, util = require('util')
, validate = require('./validate')
, bitcoin = module.exports = {}

bitcoin.configure = function(app, conn, auth, currencyId) {
    app.post('/v1/' + currencyId + '/out', auth, bitcoin.withdraw.bind(bitcoin, conn, currencyId))
    app.get('/v1/' + currencyId + '/address', auth, bitcoin.address.bind(bitcoin, conn, currencyId))
}

bitcoin.withdraw = function(conn, currencyId, req, res, next) {
    if (!validate(req.body, currencyId.toLowerCase() + '_out', res)) return

    console.log('processing withdraw request of %d %s from user #%s to %s',
        req.body.amount, currencyId, req.user, req.body.address)

    Q.ninvoke(conn.write, 'query', {
        text: 'SELECT ' + currencyId + '_withdraw ($1, $2, from_decimal($3, $4)) request_id',
        values: [req.user, req.body.address, req.body.amount, currencyId]
    })
    .then(function(cres) {
        activities.log(conn, req.user, currencyId + 'Withdraw', {
            address: req.body.address,
            amount: req.body.amount
        })
        res.send(201, { id: cres.rows[0].request_id })
    }, function(err) {
        if (err.code === '23514' && err.message.match(/non_negative_available/)) {
            return res.send(500, {
                name: 'NoFunds',
                message: 'insufficient funds'
            })
        }

        next(err)
    }, next)
    .done()
}

bitcoin.address = function(conn, currencyId, req, res, next) {
    Q.ninvoke(conn.read, 'query', {
        text: util.format(
            'SELECT address FROM %s_deposit_address WHERE account_id = user_currency_account($1, $2)',
            currencyId),
        values: [req.user, currencyId]
    })
    .then(function(cres) {
        var address = cres.rows.length ? cres.rows[0].address : null
        res.send(200, { address: address })
    }, next)
    .done()
}
