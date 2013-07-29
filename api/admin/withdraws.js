var withdraws = require('../withdraws')

module.exports = exports = function(app) {
    app.get('/admin/withdraws', app.auth.admin, function(req, res, next) {
        withdraws.query(req.app, req.query, function(err, items) {
            if (err) return next(err)
            res.send(items)
        })
    })

    app.patch('/admin/withdraws/:id', app.auth.admin, exports.patch)
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
    req.app.conn.write.query({
        text: [
            'SELECT confirm_withdraw($1)',
            'FROM withdraw_request',
            'WHERE request_id = $1 AND state = \'processing\''
        ].join('\n'),
        values: [+req.params.id]
    }, function(err, dr) {
        if (err) return next(err)

        if (dr.rowCount) {
            req.app.activity(req.user, 'AdminWithdrawComplete',
                { id: req.params.id })
            return res.send(204)
        }

        res.send(404, {
            name: 'WithdrawRequestNotFound',
            message: 'The withdraw request was not found or ' +
                'is not in the processing state'
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
