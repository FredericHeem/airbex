var ltc = module.exports = {}

ltc.configure = function(app, conn, auth) {
    app.get('/admin/ltc/height', auth, ltc.height.bind(ltc, conn))
}

ltc.height = function(conn, req, res, next) {
    conn.read.query('SELECT height FROM ltc_block', function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) return next(new Error('No blocks'))
        res.send(200, { height: dr.rows[0].height })
    })
}
