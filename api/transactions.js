/* jshint evil: true */
var builder = require('pg-builder')
, _ = require('lodash')
, debug = require('debug')('snow:transactions')
, util = require('util')

exports.format = function(app, row) {
    if (row.details) {
        try {
            row.details = JSON.parse(row.details)
        } catch (e) {
            debug('warning: transaction %d has broken json: %s', row.transaction_id,
                util.inspect(row.details))
            row.details = eval('x = \'' + row.details + '\';x')
        }
    }

    return {
        id: row.transaction_id,
        date: row.created_at,
        timestamp: row.created_at_epoch,
        type: row.type,
        amount: app.cache.formatCurrency(row.amount, row.currency_id),
        amountBtc: row.amount_btc ? app.cache.formatCurrency(row.amount_btc, 'BTC') : null,
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
        creditUserName: row.credit_user_name,
        fullRowCount: row.full_row_count
    }
}

exports.query = function(app, query, cb) {
    var q = builder()
    .f('transaction_view')
    .s('*')
    .s('extract(epoch from created_at)::int created_at_epoch')
    .s('COUNT(*) OVER() full_row_count')

    if (query.type) q = q.w('type = ${type}')
    if (query.userId) q = q.w('(debit_user_id = ${userId} OR credit_user_id = ${userId})')
    if (query.currency) q = q.w('currency_id = ${currency}')
    if (query.skip) q = q.skip(query.skip)
    if (query.minAmount) q = q.w('amount_decimal >= ${minAmount}')
    if (query.maxAmount) q = q.w('amount_decimal <= ${maxAmount}')
    if (query.minTimestamp) q = q.w('created_at >= ${minTimestamp}')
    if (query.maxTimestamp) q = q.w('created_at <= ${maxTimestamp}')

    if (query.sort) {
        var fields = {
            timestamp: 'transaction_id',
            amount: 'amount_decimal',
            amountBtc: 'amount_btc_decimal'
        }

        Object.keys(query.sort).forEach(function(n) {
            q = q.o(fields[n], query.sort[n] == 'asc' ? 'asc' : 'desc')
        })
    }

    q = q.p(_.pick(query, 'type', 'userId', 'currency', 'minAmount',
        'maxAmount', 'minTimestamp', 'maxTimestamp'))

    if (query.limit) {
        q = q.limit(query.limit)
    }

    app.conn.read.query(q, function(err, dr) {
        if (err) return cb(err)

        if (!dr.rowCount) {
            return cb(null, {
                count: 0,
                transactions: []
            })
        }

        var sres = {
            count: dr.rows[0].full_row_count,
            transactions: dr.rows.map(exports.format.bind(exports, app))
        }

        if (query.limit) {
            sres.limit = query.limit
        }

        cb(null, sres)
    })
}
