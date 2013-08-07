var withdraws = require('../withdraws')

module.exports = exports = function(app) {
    app.get('/admin/withdraws', app.auth.admin, function(req, res, next) {
        withdraws.query(req.app, req.query, function(err, items) {
            if (err) return next(err)
            res.send(items)
        })
    })

    app.patch('/admin/withdraws/:id', app.auth.admin, exports.patch)
    app.post('/admin/withdraws/:id/complete', app.auth.admin, exports.complete)
}

exports.cancel = function(req, res, next) {
    req.app.conn.write.query({
        text: 'SELECT cancel_withdraw_request($1, $2);',
        values: [+req.params.id, req.body.error || null]
    }, function(err, dr) {
        if (err) return next(err)
        if (dr.rowCount) {
            req.app.activity(req.user, 'AdminWithdrawCancel', {
                id: req.params.id,
                error: req.body.error || null
            })

            return res.send(204)
        }

        res.send(404, {
            name: 'WithdrawRequestNotFound',
            message: 'The withdraw request was not found or ' +
                'is already processing/processed'
        })
    })
}

exports.process = function(req, res, next) {
    req.app.conn.write.query({
        text: [
            'UPDATE withdraw_request',
            'SET state = \'processing\'',
            'WHERE request_id = $1 AND state = \'requested\''
        ].join('\n'),
        values: [+req.params.id]
    }, function(err, dr) {
        if (err) return next(err)

        if (dr.rowCount) {
            req.app.activity(req.user, 'AdminWithdrawProcess',
                { id: req.params.id })
            return res.send(204)
        }

        res.send(404, {
            name: 'WithdrawRequestNotFound',
            message: 'The withdraw request was not found or is not in the requested state'
        })
    })
}

exports.complete = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT a.currency_id',
            'FROM withdraw_request wr',
            'INNER JOIN account a ON a.account_id = wr.account_id',
            'WHERE wr.request_id = $1 AND wr.state = \'processing\''
        ].join('\n'),
        values: [+req.params.id]
    }, function(err, dr) {
        if (err) return next(err)

        if (!dr.rowCount) {
            return res.send(404, {
                name: 'WithdrawRequestNotFound',
                message: 'The withdraw request was not found or ' +
                    'is not in the processing state'
            })
        }

        var currency = dr.rows[0].currency_id

        req.app.conn.write.query({
            text: [
                'SELECT confirm_withdraw($1, $2)',
                'FROM withdraw_request',
                'WHERE request_id = $1 AND state = \'processing\''
            ].join('\n'),
            values: [
                +req.params.id,
                req.app.cache.parseCurrency(req.body.fee || '0', currency)
            ]
        }, function(err, dr) {
            if (err) return next(err)
            if (!dr.rowCount) return next(new Error('Concurrency fail'))

            req.app.activity(req.user, 'AdminWithdrawComplete', {
                id: +req.params.id,
                fee: req.body.fee || '0'
            })

            res.send(204)
        })
    })
}

exports.patch = function(req, res, next) {
    if (req.body.state == 'processing') {
        return exports.process(req, res, next)
    }

    if (req.body.state == 'completed') {
        return exports.complete(req, res, next)
    }

    if (req.body.state == 'cancelled') {
        return exports.cancel(req, res, next)
    }

    return next(new Error('not sure what to do with patch request'))
}
