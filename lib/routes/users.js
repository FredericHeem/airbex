var Q = require('q')
, users = module.exports = {}

users.configure = function(app, conn) {
    app.post('/public/users', users.create.bind(users, conn))
}

users.create = function(conn, req, res, next) {
    Q.ninvoke(conn, 'query', {
        text: 'select create_user($1, $2) user_id',
        values: [req.body.key, req.body.secret]
    })
    .then(function(cres) {
        res.send(201, { user_id: cres.rows[0].user_id })
    }, next)
    .done()
}
