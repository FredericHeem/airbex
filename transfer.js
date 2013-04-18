var Q = require('q')
, transfer = module.exports = {}

transfer.configure = function(app, conn, securityId) {
    app.post('/transfer', transfer.transfer.bind(transfer, conn))
}

transfer.transfer = function(conn, req, res, next) {
    conn.query({
        text: 'SELECT user_transfer_to_email($1, $2, $3, $4) transaction_id',
        values: [req.security.userId, req.body.email, req.body.security_id, req.body.amount]
    }, function(err, dres) {
        if (err) {
            if (err.message.match(/^User with email/)) {
                return res.send(400, {
                    name: 'UserNotFound',
                    message: 'The user ' + req.body.email + ' does not exist'
                })
            }

            return next(err)
        }

        res.send({ transaction_id: dres.rows[0].transaction_id })
    })
}
