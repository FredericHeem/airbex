/* jshint evil: true */
var builder = require('pg-builder')
, _ = require('lodash')
, debug = require('debug')('snow:transactions')

exports.query = function(app, query, cb) {
    var q = builder()
    .f('transaction_view')
    .s('*')
    .s('extract(epoch from created_at)::int created_at_epoch')

    if (query.type) q = q.w('type = ${type}')
    if (query.userId) q = q.w('(debit_user_id = ${userId} OR credit_user_id = ${userId})')
    if (query.currency) q = q.w('currency_id = ${currency}')
    if (query.minId) q = q.w('transaction_id >= ${minId}')
    if (query.maxId) q = q.w('transaction_id <= ${maxId}')
    if (query.minAmount) q = q.w('amount_decimal >= ${minAmount}')
    if (query.maxAmount) q = q.w('amount_decimal <= ${maxAmount}')
    if (query.minTimestamp) q = q.w('created_at >= ${minTimestamp}')
    if (query.maxTimestamp) q = q.w('created_at <= ${maxTimestamp}')

    if (query.sort) {
        var fields = {
            timestamp: 'created_at',
            amount: 'amount_decimal',
            amountBtc: 'amount_btc_decimal'
        }

        Object.keys(query.sort).forEach(function(n) {
            q = q.o(fields[n], query.sort[n] == 'asc' ? 'asc' : 'desc')
        })
    }

    q.p(_.pick(query, 'type', 'userId', 'currency', 'minId', 'maxId', 'minAmount',
        'maxAmount', 'minTimestamp', 'maxTimestamp'))

    q = q.limit(50)

    app.conn.read.query(q, function(err, dr) {
        if (err) return cb(err)
        cb(null, dr.rows.map(function(row) {
            if (row.details) {
                try {
                    row.details = JSON.parse(row.details)
                } catch (e) {
                    debug('warning: transaction %d has broken json', row.transaction_id)
                    row.details = eval('x = \'' + row.details + '\';x')
                }
            }

            return {
                id: row.transaction_id,
                date: row.created_at,
                timestamp: row.created_at_epoch,
                type: row.type,
                amount: app.cache.formatCurrency(row.amount, row.currency_id),
                amountBtc: app.cache.formatCurrency(row.amount_btc, 'BTC'),
                currency: row.currency_id,
                details: row.details,
                creditUserId: row.credit_user_id,
                debitUserId: row.debit_user_id,
                debitUserEmail: row.debit_user_email,
                creditUserEmail: row.credit_user_email,
                creditAccountType: row.credit_account_type,
                debitAccountType: row.debit_account_type,
                debitAccountId: row.debit_account_id,
                creditAccountId: row.credit_account_id,
                debitUserName: row.debit_user_name,
                creditUserName: row.credit_user_name
            }
        }))
    })
}
