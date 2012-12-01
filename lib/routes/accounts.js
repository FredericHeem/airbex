var db = require('../db')
, async = require('async')
, debug = require('debug')('snow:accounts')
, _ = require('underscore');

var self = module.exports = {
    forUser: function(userId, cb) {
        var client = db();

        debug('fetching accounts for user ' + userId);

        client.query({
            text: 'SELECT account_id, security_id, type, balance, hold, available, user_id FROM account_view WHERE user_id = $1',
            values: [userId]
        }, function(err, res) {
            client.end();
            if (err) return cb(err);
            debug('found ' + res.rows.length + ' accounts');
            cb(null, res.rows);
        });
    },

    create: function(userId, securityId, cb) {
        if (!userId) return cb(new Error('userId missing'))

        var client = db()

        client.query(client.build.insert('account', {
            security_id: securityId,
            user_id: userId,
            type: 'current'
        }, 'account_id'), function(err, res) {
            client.end()
            if (err) return cb(err)
            cb(null, res.rows[0].account_id)
        })
    },

    configure: function(app) {
        app.post('/private/accounts', function(req, res, next) {
            self.create(req.security.userId, req.params.security_id, function(err, id) {
                    if (err) return next(err)
                    res.send({ account_id: id })
                    res.end()
            })
        })

        app.get('/private/accounts', function(req, res, next) {
            self.forUser(req.security.userId, function(err, accounts) {
                if (err) return next(err)
                res.send(accounts)
            })
        })
    }
}