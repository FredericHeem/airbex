var db = require('./db')
, _ = require('underscore')
, bcrypt = require('bcrypt');

var self = module.exports = {
    create: function(attr, cb) {
        var client = db();
        var q = 'select create_user($1, $2) user_id';

        var key = bcrypt.genSaltSync(100)
        , secret = bcrypt.genSaltSync(100)

        client.query({
            text: q,
            values: [key, secret]
        }, function(err, res) {
            client.end()
            cb(err, err || { key: key, secret: secret, user_id: res.rows[0].user_id })
        })
    },

    configure: function(app) {
        app.post('/public/users', function(req, res, next) {
            self.create({}, function(err, user) {
                if (err) return next(err);
                res.send(user);
                next();
            });
        });
    }
};