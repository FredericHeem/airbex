module.exports = exports = function(app) {
    app.get('/admin/btc/height', app.security.demand.admin, exports.height)
}

exports.height = function(req, res, next) {
    req.app.conn.read.query('SELECT bitcoin_height FROM settings', function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) return next(new Error('No blocks'))
        res.send(200, { height: dr.rows[0].bitcoin_height })
    })
}
