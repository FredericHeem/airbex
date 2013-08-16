var transactions = require('../transactions')

module.exports = exports = function(app) {
    app.post('/admin/transactions', app.auth.admin, exports.index)
}

exports.index = function(req, res, next) {
    transactions.query(req.app, req.body, function(err, t) {
        if (err) return next(err)
        res.send(t)
    })
}
