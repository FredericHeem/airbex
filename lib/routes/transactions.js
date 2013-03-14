var debug = require('debug')('snow:transactions')
, async = require('async')
, util = require('util')
, self = module.exports = {
    db: require('../db'),

    create: function(userId, debitAccountId, creditAccountId, amount, cb) {
        if (amount % 1 !== 0) return cb(new Error('amount, "' + amount + '" has decimals'))
        if (!userId) return cb(new Error('userId missing'))

        var client = self.db()

        async.series({
            'verify source': function(next) {
                client.query({
                    text: 'SELECT user_id, type FROM account WHERE account_id = $1',
                    values: [debitAccountId]
                }, function(err, res) {
                    if (err) return next(err)

                    if (!res.rowCount) {
                        err = new Error('debit account not found')
                        err.code = 'EDEBITACCOUNTNOTFOUND'
                        return next(err)
                    }

                    if (res.rows[0].user_id !== userId) {
                        err = new Error('user does not own account')
                        err.code = 'EDEBITACCOUNTACCESSDENIED'
                        return next(err)
                    }

                    if (res.rows[0].type !== 'current') {
                        err = new Error('invalid debit account type')
                        err.code = 'EDEBITACCOUNTINVALIDTYPE'
                        return next(err)
                    }

                    next()
                })
            },

            'verify dest': function(next) {
                client.query({
                    text: 'SELECT type FROM account WHERE account_id = $1',
                    values: [creditAccountId]
                }, function(err, res) {
                    if (err) return next(err)

                    if (!res.rowCount) {
                        err = new Error('credit account not found')
                        err.code = 'ECREITACCOUNTNOTFOUND'
                        return next(err)
                    }

                    if (res.rows[0].type !== 'current') {
                        err = new Error('invalid credit account type')
                        err.code = 'ECREDITACCOUNTINVALIDTYPE'
                        return next(err)
                    }

                    next()
                })
            },

            'insert': function(next) {
                client.query(client.build.insert('transaction', {
                    debit_account_id: debitAccountId,
                    credit_account_id: creditAccountId,
                    amount: amount
                }, 'transaction_id'), function(err, res) {
                    if (err) return next(err)
                    next(null, res.rows[0].order_id)
                });
            }
        }, function(err, res) {
            client.end()
            cb(err, err ? null : res.insert)
        })
    },

    configure: function(app) {
        app.post('/private/transactions', function(req, res, next) {
            self.create(
                req.security.userId,
                +req.body.debit_account_id,
                +req.body.credit_account_id,
                +req.body.amount,
                function(err, id) {
                    if (err) return next(err);
                    res.send(200, { transaction_id: id })
                }
            )
        })
    }
}