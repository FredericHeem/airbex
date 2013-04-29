var Q = require('q')
, activities = module.exports = {}

activities.configure = function(app, conn, auth) {
    app.get('/activities', auth, activities.activities.bind(activities, conn))
}

activities.activities = function(conn, req, res, next) {
    var query = [
        'SELECT created, "type", details',
        'FROM activity',
        'WHERE user_id = $1',
        'ORDER BY activity_id DESC'
    ].join('\n')

    Q.ninvoke(conn, 'query', {
        text: query,
        values: [req.user]
    })
    .then(function(dres) {
        res.send(dres.rows.map(function(row) {
            row.details = JSON.parse(row.details)
            return row
        }))
    }, next)
    .done()
}

activities.log = function(conn, userId, type, details, retry) {
    console.log('user #%d activity: %s %j', userId, type, details)
    conn.query({
        text: 'INSERT INTO activity (user_id, "type", details) VALUES ($1, $2, $3)',
        values: [userId, type, JSON.stringify(details)]
    }, function(err) {
        if (!err) return
        console.error('Failed to log activity (try #%d)', (retry || 0) + 1)
        console.error(err)
        if (retry == 3) return
        setTimeout(function() {
            activities.log(conn, userId, type, details, (retry || 0) + 1)
        }, 1000)
    })
}
