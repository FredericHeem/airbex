module.exports = exports = function(app) {
    return exports.log.bind(exports, app)
}

exports.log = function(app, userId, type, details, retry) {
    console.log('user #%d activity: %s %j', userId, type, details)
    app.conn.write.query({
        text: 'INSERT INTO activity (user_id, "type", details) VALUES ($1, $2, $3)',
        values: [userId, type, JSON.stringify(details)]
    }, function(err) {
        if (!err) return
        console.error('Failed to log activity (try #%d)', (retry || 0) + 1)
        console.error(err)
        if (retry == 3) return
        setTimeout(function() {
            exports.log(app, userId, type, details, (retry || 0) + 1)
        }, 1000)
    })
}
