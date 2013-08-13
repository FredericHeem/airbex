var crypto = require('crypto')
, async = require('async')

module.exports = exports = function(app) {
    app.post('/v1/vouchers', app.auth.withdraw(2), function(req, res, next) {
        if (!req.app.validate(req.body, 'v1/voucher_create', res)) return

        exports.create(
            req.app,
            req.user,
            req.body.currency,
            req.body.amount,
            function(err, code) {
                if (err) return next(err)
                res.send(201, { voucher: code })
            }
        )
    })

    app.post('/v1/vouchers/:id/redeem', app.auth.deposit(2), function(req, res, next) {
        exports.redeem(req.app, req.user, req.params.id, function(err, details) {
            if (!err) {
                return res.send(details)
            }

            if (err.name == 'VoucherNotFound') {
                return res.send(400, {
                    name: 'VoucherNotFound',
                    message: 'Voucher not found'
                })
            }

            next(err)
        })
    })

    app.get('/v1/vouchers', app.auth.any, exports.index)
}

exports.create = function(app, userId, currency, amount, cb) {
    var voucherId = exports.createId()

    app.conn.write.query({
        text: [
            'SELECT create_voucher($1, $2, $3, $4)'
        ].join('\n'),
        values: [
            voucherId,
            userId,
            currency,
            app.cache.parseCurrency(amount, currency)
        ]
    }, function(err) {
        if (err) return cb(err)

        app.activity(userId, 'CreateVoucher', {
            currency: currency,
            amount: amount
        })

        cb(null, voucherId)
    })
}

exports.createId = function() {
    var id = crypto.randomBytes(5).toString('hex').toUpperCase()
    , hash = crypto.createHash('sha256')
    hash.update(id)

    var checksum = hash.digest('hex').substr(0, 2).toUpperCase()

    return id + checksum
}

exports.index = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT v.voucher_id, h.amount, a.currency_id',
            'FROM voucher v',
            'INNER JOIN "hold" h ON h.hold_id = v.hold_id',
            'INNER JOIN account a ON a.account_id = h.account_id',
            'WHERE a.user_id = $1'
        ].join('\n'),
        values: [req.user]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(201, dr.rows.map(function(row) {
            return {
                code: row.voucher_id,
                currency: row.currency_id,
                amount: req.app.cache.formatCurrency(row.amount, row.currency_id)
            }
        }))
    })
}

exports.redeem = function(app, user, voucher, cb) {
    async.waterfall([
        function(cb) {
            app.conn.write.query({
                text: [
                    'SELECT redeem_voucher($1, $2) tid'
                ].join('\n'),
                values: [
                    voucher,
                    user
                ]
            }, cb)
        },

        function(dr, cb) {
            if (!dr.rowCount) {
                var err = new Error('Voucher not found')
                err.name = 'VoucherNotFound'
                return cb(err)
            }

            if (!dr.rows[0].tid) {
                return cb(null, null)
            }

            app.conn.read.query({
                text: [
                    'SELECT t.amount, a.currency_id',
                    'FROM "transaction" t',
                    'INNER JOIN account a ON a.account_id = t.credit_account_id',
                    'WHERE t.transaction_id = $1'
                ].join('\n'),
                values: [dr.rows[0].tid]
            }, cb)
        },

        function(dr, cb) {
            console.log(dr)
            if (!dr) {
                // Voucher was cancelled
                return cb(null, {
                    cancelled: true
                })
            }

            var row = dr.rows[0]

            cb(null, {
                currency: row.currency_id,
                amount: app.cache.formatCurrency(row.amount, row.currency_id)
            })
        }
    ], cb)
}
