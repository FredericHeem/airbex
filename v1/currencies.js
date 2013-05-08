var Q = require('q')
, currencies = module.exports = {}

currencies.configure = function(app, conn) {
    app.get('/v1/currencies', currencies.currencies.bind(currencies, conn))
}

currencies.currencies = function(conn, req, res, next) {
    var query =
        'SELECT currency_id id, scale \
        FROM "currency" ORDER BY currency_id'

    Q.ninvoke(conn, 'query', query)
    .then(function(cres) {
        res.send(cres.rows)
    }, next)
    .done()
}
