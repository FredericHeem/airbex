var db = require('./db')
, _ = require('underscore')
, bcrypt = require('bcrypt');

var self = module.exports = {
    create: function(attr, cb) {
        attr = _.pick(attr, 'username', 'password');

        if (!attr.username) return cb(new Error('username missing'));
        if (attr.username.length < 3) return cb(new Error('username too short'));
        if (!attr.password) return cb(new Error('password missing'));
        if (attr.password.length < 5) return cb(new Error('password too short'));

        attr.password = bcrypt.hashSync(attr.password, bcrypt.genSaltSync(10));

        var client = db();
        var q = client.build.insert('"user"', attr, 'user_id');

        client.query(q, function(err, res) {
            if (err && err.message == 'duplicate key value violates unique constraint "user_username_lower_key"') {
                return cb(new Error('username taken'));
            }

            client.end();
            cb(err, err || res.rows[0].user_id);
        });
    },

    accounts: function(userId, cb) {

    },

    configure: function(app) {
        app.post('/public/users', function(req, res, next) {
            self.create({ username: req.body.username, password: req.body.password }, function(err, id) {
                if (err) return next(err);
                res.send({ id: id });
                next();
            });
        });
    }
};