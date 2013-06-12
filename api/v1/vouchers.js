var _ = require('lodash')
, activities = require('./activities')
, validate = require('./validate')
, debug = require('debug')('snow:vouchers')
, crypto = require('crypto')
, async = require('async')
, vouchers = module.exports = {}

vouchers.configure = function(app, conn, auth) {
    app.post('/v1/vouchers', auth, vouchers.create.bind(vouchers, conn))
    app.post('/v1/vouchers/:id/redeem', auth, vouchers.redeem.bind(vouchers, conn))
}

vouchers.createId = function() {
    var id = crypto.randomBytes(5).toString('hex').toUpperCase()
    , hash = crypto.createHash('sha256')
    hash.update(id)

    var checksum = hash.digest('hex').substr(0, 2).toUpperCase()

    return id + checksum
}

/*
CREATE FUNCTION create_voucher (
    vid voucher_id,
    uid int,
    cid currency_id,
    amnt bigint
) RETURNS void AS $$
*/
vouchers.create = function(conn, req, res, next) {
    if (!validate(req.body, 'voucher_create', res)) return

    var voucherId = vouchers.createId()

    conn.write.query({
        text: [
            'SELECT create_voucher($1, $2, $3, $4)'
        ].join('\n'),
        values: [
            voucherId,
            req.user,
            req.body.currency,
            req.app.cache.parseCurrency(req.body.amount, req.body.currency)
        ]
    }, function(err) {
        if (err) return next(err)
        res.send(201, { voucher: voucherId })
    })
}

/*
CREATE FUNCTION redeem_voucher (
    vid voucher_id,
    duid int
) RETURNS int AS $$
*/
vouchers.redeem = function(conn, req, res, next) {
    async.waterfall([
        function(next) {
            conn.write.query({
                text: [
                    'SELECT redeem_voucher($1, $2) tid'
                ].join('\n'),
                values: [
                    req.params.id,
                    req.user
                ]
            }, next)
        },

        function(dr, next) {
            if (!dr.rows[0].tid) {
                return res.send(204)
            }

            conn.read.query({
                text: [
                    'SELECT t.amount, a.currency_id',
                    'FROM "transaction" t',
                    'INNER JOIN account a ON a.account_id = t.credit_account_id',
                    'WHERE t.transaction_id = $1'
                ].join('\n'),
                values: [dr.rows[0].tid]
            }, next)
        },

        function(dr) {
            var row = dr.rows[0]
            res.send(200, {
                currency: row.currency_id,
                amount: req.app.cache.formatCurrency(row.amount, row.currency_id)
            })
        }
    ], next)
}
