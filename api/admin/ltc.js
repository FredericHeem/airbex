module.exports = exports = function(app) {
    app.get('/admin/ltc/height', app.adminAuth, exports.height)
}

exports.height = function(req, res, next) {
    req.app.conn.read.query('SELECT height FROM ltc_block', function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) return next(new Error('No blocks'))
        res.send(200, { height: dr.rows[0].height })
    })
}
