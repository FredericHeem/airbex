var db = require('./db')
, config = require('../config')
, debug = require('debug')('snow:BitcoinEdge')
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
    var client = db();
    cb = _.wrap(cb, function(cb) {
        client.end();
        cb.apply(this, _.toArray(arguments).splice(1));
    });

    debug('processing request from user ' + userId + ' to withdraw ' + amount + ' to ' + address)

    client.query({
        text: 'SELECT ' + this.options.securityId + '_withdraw ($1, $2, $3) hold_id',
        values: [userId, address, amount]
    }, function(err, cres) {
        cb(err, err || cres.rows[0].hold_id)
    })
}

BitcoinEdge.prototype.configure = function(app) {
    var self = this;

    app.post('/private/withdraw/' + self.options.securityId, function(req, res, next) {
        self.withdraw(req.security.userId, req.params.address, req.params.amount, function(err, sres) {
            if (err) {
                if (err.code === '23514' && err.message.match(/non_negative_available/)) {
                    return res.send(500, { code: 'ENOFUNDS', message: 'insufficient funds available in source account' })
                }

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

    var send = function() {
        self.send(function(err) {
            if (err) console.error('send error', err)
            setTimeout(send, 1000 * 10)
        })
    }

    send()
}

BitcoinEdge.prototype.send = function(cb) {
    var self = this;

    // no need to use semaphore. can create a batch id and assign it to the pending ones
    self.semaphore.take(function(leave) {
        var client = db();

        cb = _.wrap(cb, function(inner) {
            client.end();
            leave();
            inner.apply(this, _.toArray(arguments).splice(1));
        });

        var q = ['SELECT lp.hold_id hold_id, lp.address address, h.amount / 10^(s.scale) amount',
                'FROM ' + self.options.securityId + '_withdraw_queue lp',
                'INNER JOIN hold h on h.hold_id = lp.hold_id',
                'INNER JOIN account a on a.account_id = h.account_id',
                'INNER JOIN security s on s.security_id = a.security_id'].join('\n')

        client.query(q, function(err, res) {
            if (err) return cb(err);

            if (!res.rowCount) {
                debug('no pending sends');
                return cb();
            }

            debug('will send ' + res.rowCount + ' transactions')

            var r = _.reduce(res.rows, function(r, i) { r[i.address] = i.amount; return r; }, { });

            debug('sends to perform: ' + JSON.stringify(r, null, 4))

            self.bitcoin.sendMany('credited', r, function(err, cres) {
                if (err) return cb(err);

                async.forEach(res.rows, function(row, next) {
                    client.query({
                        text: 'SELECT ' + self.options.securityId + '_confirm_withdraw($1, $2)',
                        values: [cres, row.hold_id]
                    }, next);
                }, function(err, res) {
                    cb(err, res);
                })
            })
        })
    })
}

BitcoinEdge.prototype.sync = function(accountId, cb) {
    var self = this;

    self.semaphore.take(function(leave) {
        debug('syncing account ' + accountId);

        cb = _.wrap(cb, function(inner) {
            client.end();
            leave();
            inner.apply(this, _.toArray(arguments).splice(1));
        });

        var client = db()
        , credited
        , newCredited;

        async.series({
            'find old credited': function(next) {
                client.query({
                    text: 'SELECT sum(credited) credited FROM ' + self.options.securityId + '_deposit_address WHERE account_id = $1',
                    values: [accountId]
                }, function(err, res) {
                    if (err) return next(err);

                    if (res.rows[0].credited === null) {
                        return next(new Error('account does not have a any deposit address'));
                    }

                    credited = res.rows[0].credited;

                    debug('old credited ' + credited.toString());
                    next();
                });
            }
,
            'get received': function(next) {
                debug('checking received by account-' + accountId);
                self.bitcoin.getReceivedByAccount('account-' + accountId, 0, function(err, nc) {
                    if (err) return next(err);
                    newCredited = num(nc);
                    debug('new credited: ' + newCredited.toString());
                    next();
                });
            },

            'update if necessary': function(next) {
                var diff = +(newCredited.sub(num(credited, 8))).mul(1e8); // todo: magic number
                if (diff < 0) return debug('credited has decreased, probably from changing minconf')
                if (diff === 0) return next();
                debug('received has changed from ' + credited.toString() + ' to ' + newCredited.toString());
                debug('which has an integer diff of ' + diff);

                self.bitcoin.move('account-' + accountId, 'credited', num(diff, 8).toString(), function(err) {
                    if (err) return next(err)

                    debug('moving the diff, ' + num(diff, 8).toString() + ' to the credited account')

                    client.query({
                        text: 'SELECT ' + self.options.securityId + '_credit($1, $2, $3)',
                        values: [accountId, credited, diff]
                    }, function(err, res) {
                        if (err) return next(err);
                        debug('credit successful');
                        next();
                    });
                });
            }
        }, cb);
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

                debug('fetching/generating address with RPC (for account-' + accountId + ')');

                self.bitcoin.getNewAddress('account-' + accountId, function(err, a) {
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
