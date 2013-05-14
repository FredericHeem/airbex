var credit = module.exports = {}
, activities = require('../v1/activities')

credit.configure = function(app, conn, auth) {
    app.post('/admin/credit', auth, credit.credit.bind(credit, conn))
}

// user_id, currenc, amount
credit.credit = function(conn, req, res, next) {
    // conversion from string to properly scaled bigint is performed
    // in the actual query
    conn.write.query({
        text: [
            'SELECT edge_credit($1, $2, ($3::numeric * 10^scale)::bigint)',
            'FROM currency',
            'WHERE currency_id = $2'
        ].join('\n'),
        values: [req.body.user_id, req.body.currency_id, req.body.amount]
    }, function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) return next(new Error('currency not found ' + req.body.currency_id))
        activities.log(conn, req.user, 'AdminEdgeCredit', req.body)
        res.send(204)
    })
}
