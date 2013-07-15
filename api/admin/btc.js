var btc = module.exports = {}

btc.configure = function(app, conn, auth) {
    app.get('/admin/btc/height', auth, btc.height.bind(btc, conn))
}

btc.height = function(conn, req, res, next) {
    conn.read.query('SELECT bitcoin_height FROM settings', function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) return next(new Error('No blocks'))
        res.send(200, { height: dr.rows[0].bitcoin_height })
    })
}
