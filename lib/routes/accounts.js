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

    configure: function(app) {
        app.get('/private/accounts', function(req, res, next) {
            var accountId;

            async.series({
                'get accounts': function(next) {
                    self.forUser(req.security.userId, function(err, accounts) {
                        if (err) return next(err)
                        var account = _.where(accounts, { security_id: 'BTC' })[0]
                        if (account) accountId = account.account_id
                        next()
                    })
                },
                'send accounts': function(next) {
                    self.forUser(req.security.userId, function(err, accounts) {
                        if (err) return next(err)
                        res.send(accounts)
                    })
                },
            }, function(err) {
                if (err) console.error(err)
            })
        });
    }
};