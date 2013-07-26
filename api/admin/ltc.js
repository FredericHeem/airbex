module.exports = exports = function(app) {
    app.get('/admin/ltc/height', app.auth.admin, exports.height)
}

exports.height = function(req, res, next) {
    req.app.conn.read.query('SELECT litecoin_height FROM settings', function(err, dr) {
        if (err) return next(err)
        res.send(200, { height: dr.rows[0].litecoin_height })
    })
}
