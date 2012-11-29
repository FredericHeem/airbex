var db = require('./db')
, config = require('../config')
, debug = require('debug')('snow:btc-edge:rest')
, num = require('num')
, util = require('util')
, _ = require('underscore')
, async = require('async')

var BitcoinEdge = module.exports = function(options) {
    this.options = options

    debug('configuring with endpoint ' + util.inspect(options.endpoint))

    this.bitcoin = new (require('bitcoin').Client)(options.endpoint)
    this.semaphore = new require('semaphore')()
}

BitcoinEdge.prototype.withdraw  = function(userId, address, amount, cb) {
    var self = this
    , client = db()

    cb = _.wrap(cb, function(cb) {
        client.end();
        cb.apply(this, _.toArray(arguments).splice(1));
    });

    debug('processing request from user ' + userId + ' to withdraw ' + amount + ' to ' + address)

    async.series({
        'validate address': function(next) {
            debug('validating address ' + address)

            self.bitcoin.validateAddress(address, function(err, res) {
                if (err) return next(err)

                if (res.isvalid === true) {
                    debug('address ' + address + ' validated')
                    return next()
                }

                if (res.isvalid === false) {
                    var error = new Error(address + ' is not a valid bitcoin address')
                    error.code = 'EINVALIDADDRESS'
                    return next(error)
                }

                next(new Error('not sure if address is valid: ' + util.inspect(res)))
            })
        },

        'create request': function(next) {
            debug('executing query')

            client.query({
                text: 'SELECT ' + self.options.securityId + '_withdraw ($1, $2, $3) request_id',
                values: [userId, address, amount]
            }, function(err, cres) {
                next(err, err || cres.rows[0].request_id)
            })
        }
    }, function(err, res) {
        cb(err, err || res['create request'])
    })
}

BitcoinEdge.prototype.configure = function(app) {
    var self = this;

    debug('configuring edge for ' + self.options.securityId)

    app.post('/private/withdraw/' + self.options.securityId, function(req, res, next) {
        self.withdraw(req.security.userId, req.params.address, req.params.amount, function(err, sres) {
            if (err) {
                if (err.code === '23514' && err.message.match(/non_negative_available/)) {
                    return res.send(500, { code: 'ENOFUNDS', message: 'insufficient funds available in source account' })
                }

                if (err.code === 'EINVALIDADDRESS') {
                    return res.send(500, _.pick(err, 'code', 'message'))
                }

                console.error(err)

                return next(err)
            }

            res.send(201, { hold_id: sres })
        })
    })

    app.get('/private/deposit/' + self.options.securityId + '/address', function(req, res, next) {
        var client = db();
        client.query({
            text: 'SELECT user_security_account($1, $2) account_id',
            values: [req.security.userId, self.options.securityId]
        }, function(err, cres) {
            client.end();
            if (err) { console.error(err); return next(err); }

            var accountId = cres.rows[0].account_id;
            if (!accountId) return next(new Error('account not found'));

            self.depositAddress(accountId, function(err, cres) {
                if (err) return next(err);
                res.send({ address: cres });
            });
        });
    })

    app.get('/private/' + self.options.securityId + '/sync', function(req, res, next) {
        var client = db();
        client.query({
            text: 'SELECT user_security_account($1, $2) account_id',
            values: [req.security.userId, self.options.securityId]
        }, function(err, cres) {
            client.end();
            if (err) return next(err);

            var accountId = cres.rows[0].account_id;
            if (!accountId) return next(new Error('account not found'));

            self.sync(accountId, function(err, cres) {
                if (err) return next(err);
                console.log('sync res', cres)
                res.send({ });
            });
        });
    });
}

BitcoinEdge.prototype.depositAddress = function(accountId, cb) {
    var self = this;

    self.semaphore.take(function(leave) {
        debug('getting dep address for account ' + accountId);
        var client = db();

        cb = _.wrap(cb, function(inner) {
            client.end();
            leave();
            inner.apply(this, _.toArray(arguments).splice(1));
        });

        var address;

        async.series({
            'find in db': function(next) {
                client.query({
                    text: 'SELECT address FROM ' + self.options.securityId + '_deposit_address WHERE account_id = $1',
                    values: [accountId]
                }, function(err, res) {
                    if (err) return next(err);
                    if (res.rowCount) address = res.rows[0].address;
                    next();
                });
            },

            'create with rpc': function(next) {
                if (address) return next();

                debug('fetching/generating address with RPC')

                self.bitcoin.getNewAddress(function(err, a) {
                    if (err) return next(err);
                    address = a;

                    client.query({
                        text: [
                            'INSERT INTO ' + self.options.securityId + '_deposit_address (account_id, address)',
                            'VALUES ($1, $2)'
                        ].join('\n'),
                        values: [accountId, address]
                    }, next);
                });
            }
        }, function(err) {
            cb(err, address);
        });
    });
}