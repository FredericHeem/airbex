var db = require('../db')
, _ = require('underscore')
, bcrypt = require('bcrypt');

var self = module.exports = {
    create: function(key, secret, cb) {
        var client = db();
        var q = 'select create_user($1, $2) user_id';

        client.query({
            text: q,
            values: [key, secret]
        }, function(err, res) {
            client.end()
            if (err) return cb(err)
            cb(null, {})
        })
    },

    configure: function(app) {
        app.post('/public/users', function(req, res, next) {
            self.create(req.params.key, req.params.secret, function(err, user) {
                if (err) return next(err);
                res.send(user);
                next();
            });
        });
    }
};