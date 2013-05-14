var withdraws = module.exports = {}
, activities = require('../v1/activities')

withdraws.configure = function(app, conn, auth) {
    app.get('/admin/withdraws', auth, withdraws.index.bind(withdraws, conn))
    app.patch('/admin/withdraws/:id', auth, withdraws.patch.bind(withdraws, conn))
}

withdraws.index = function(conn, req, res, next) {
    var query = [
    'SELECT *',
    'FROM manual_withdraw_request_view',
    'WHERE state NOT IN (\'cancelled\', \'completed\')'
    ].join('\n')

    conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(row) {
            row.amount = req.app.cache.formatCurrency(row.amount, row.currency_id)
            return row
        }))
    })
}

withdraws.cancel = function(conn, req, res, next) {
    conn.write.query({
        text: 'SELECT cancel_withdraw_request($1, $2);',
        values: [+req.params.id, req.body.error || null]
    }, function(err, dr) {
        if (err) return next(err)
        if (dr.rowCount) {
            activities.log(conn, req.user, 'AdminWithdrawCancel', { id: req.params.id, error: req.body.error || null })
            return res.send(204)
        }

        res.send(404, {
            name: 'WithdrawRequestNotFound',
            message: 'The withdraw request was not found or is already processing/processed'
        })
    })
}

withdraws.process = function(conn, req, res, next) {
    conn.write.query({
        text: [
            'UPDATE withdraw_request',
            'SET state = \'processing\'',
            'WHERE request_id = $1 AND state = \'requested\''
        ].join('\n'),
        values: [+req.params.id]
    }, function(err, dr) {
        if (err) return next(err)

        if (dr.rowCount) {
            activities.log(conn, req.user, 'AdminWithdrawProcess', { id: req.params.id })
            return res.send(204)
        }

        res.send(404, {
            name: 'WithdrawRequestNotFound',
            message: 'The withdraw request was not found or is not in the requested state'
        })
    })
}

withdraws.complete = function(conn, req, res, next) {
    conn.write.query({
        text: [
            'SELECT confirm_withdraw($1)',
            'FROM withdraw_request',
            'WHERE request_id = $1 AND state = \'processing\''
        ].join('\n'),
        values: [+req.params.id]
    }, function(err, dr) {
        if (err) return next(err)

        if (dr.rowCount) {
            activities.log(conn, req.user, 'AdminWithdrawComplete', { id: req.params.id })
            return res.send(204)
        }

        res.send(404, {
            name: 'WithdrawRequestNotFound',
            message: 'The withdraw request was not found or is not in the processing state'
        })
    })
}

withdraws.patch = function(conn, req, res, next) {
    if (req.body.state == 'processing') {
        return withdraws.process(conn, req, res, next)
    }

    if (req.body.state == 'completed') {
        return withdraws.complete(conn, req, res, next)
    }

    if (req.body.state == 'cancelled') {
        return withdraws.cancel(conn, req, res, next)
    }

    return next(new Error('not sure what to do with patch request'))
}
