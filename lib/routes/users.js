var Q = require('q')

var Users = module.exports = function(conn) {
    this.conn = conn
}

Users.prototype.create = function(key, secret) {
    return Q.ninvoke(this.conn, 'query', {
        text: 'select create_user($1, $2) user_id',
        values: [key, secret]
    }).get('rows').get(0).get('user_id')
}

Users.prototype.configure = function(app) {
    var that = this
    app.post('/public/users', function(req, res, next) {
        that.create(req.body.key, req.body.secret)
        .fail(next)
        .then(function() {
            res.send(201, {})
        })
        .done()
    })
}
