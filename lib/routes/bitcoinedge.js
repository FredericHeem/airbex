var debug = require('debug')('snow:btc-edge:rest')
, num = require('num')
, util = require('util')
, _ = require('underscore')
, Q = require('q')

var BitcoinEdge = module.exports = function(options) {
    this.options = options
}

BitcoinEdge.prototype.withdraw  = function(userId, address, amount) {
    console.log('processing withdraw request of %d %s from user #%s to %s',
        amount, this.options.securityId, userId, address)

    return Q.ninvoke(this.db, 'query', {
        text: 'SELECT ' + this.options.securityId + '_withdraw ($1, $2, $3) request_id',
        values: [userId, address, amount]
    })
    .get('rows').get(0).get('request_id')
}

BitcoinEdge.prototype.getUserSecurityAccount = function(userId) {
    return Q.ninvoke(this.db, 'query', {
        text: 'SELECT user_security_account($1, $2) account_id',
        values: [userId, this.options.securityId]
    })
    .get('rows').get(0).get('account_id')
}

BitcoinEdge.prototype.getDepositAddress = function(accountId) {
    return Q.ninvoke(this.db, 'query', {
        text: 'SELECT address FROM ' + this.options.securityId + '_deposit_address WHERE account_id = $1',
        values: [accountId]
    })
    .get('rows')
    .then(function(rows) {
        return rows.length ? rows[0].address : null
    })
}

BitcoinEdge.prototype.configure = function(app) {
    var that = this

    app.post('/private/withdraw/' + this.options.securityId, function(req, res, next) {
        that.withdraw(req.security.userId, req.params.address, req.params.amount)
        .then(function(requestId) {
            res.send(201, { request_id: requestId })
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
        })
        .done()
    })

    app.get('/private/deposit/' + that.options.securityId + '/address', function(req, res, next) {
        that.getUserSecurityAccount(req.security.userId)
        .then(that.getDepositAddress.bind(that))
        .then(function(address) {
            res.send({ address: address })
        }, next)
        .done()
    })
}
