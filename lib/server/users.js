var bcrypt = require('bcrypt')
, config = require('../../config')
, db = require('monk')(config('db'));

module.exports = {
    login: function(username, password, cb) {
        db.get('users').findOne({ username: username }, function(err, user) {
            if (err) return cb(err);
            if (!user) return cb();
            if (!bcrypt.compareSync(password, user.password)) return cb();
            cb(null, user);
        });
    }
};