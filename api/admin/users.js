var users = module.exports = {}
, activities = require('../v1/activities')

users.configure = function(app, conn, auth) {
    app.get('/admin/users/:id', auth, users.user.bind(users, conn))
}

users.user = function(conn, req, res, next) {
    conn.read.query({
        text: [
            'SELECT * FROM "user" WHERE user_id = $1'
        ].join('\n'),
        values: [+req.params.id]
    }, function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) return res.send(404, {
            name: 'UserNotFound',
            message: 'There is no user with the specified id.'
        })
        res.send(dr.rows[0])
    })
}
