var Q = require('q')
, securities = module.exports = {}

securities.configure = function(app, conn) {
    app.get('/securities', securities.securities.bind(securities, conn))
}

securities.securities = function(conn, req, res, next) {
    var query =
        'SELECT security_id, scale \
        FROM "security" ORDER BY security_id'

    Q.ninvoke(conn, 'query', query)
    .then(function(cres) {
        res.send(cres.rows)
    }, next)
    .done()
}
