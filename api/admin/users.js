var users = module.exports = {}
, _ = require('lodash')
, format = require('util').format
, activities = require('../v1/activities')

users.configure = function(app, conn, auth) {
    app.get('/admin/users', auth, users.users.bind(users, conn))
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

users.buildQuery = function(params) {
    var query = ['SELECT * FROM "user"']
    , conditions = []
    , values = []

    if (params.user_id || params.all) conditions.push(['user_id', params.user_id || params.all ])
    if (params.phone_number || params.all) conditions.push(['phone_number', params.phone_number || params.all])
    if (params.first_name || params.all) conditions.push(['first_name', params.first_name || params.all])
    if (params.last_name || params.all) conditions.push(['last_name', params.last_name || params.all])
    if (params.country || params.all) conditions.push(['country', params.country || params.all])
    if (params.email || params.all) conditions.push(['email', params.email || params.all])

    if (conditions.length) {
        query.push('WHERE')
        query.push(conditions.map(function(x) {
            values.push('%' + x[1] + '%')
            return format('%s::varchar ~~* $%d', x[0], values.length)
        }).join(' OR '))
    }

    query.push('ORDER BY user_id ASC')

    return {
        text: query.join('\n'),
        values: values
    }
}

users.users = function(conn, req, res, next) {
    var query = users.buildQuery(req.query)
    console.log(JSON.stringify(query, null, 4))
    conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        return res.send(dr.rows)
    })
}
