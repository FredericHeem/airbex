var _ = require('underscore')
, config = require('konfu')

var self = module.exports = {
    db: require('../db'),

    index: function(cb) {
        var client = self.db(config.pg_url, config.pg_native);
        client.query({
            text:
                'SELECT security_id, scale FROM security ORDER BY security_id'
        }, function(err, res) {
            client.end();
            cb(err, err ? null : res.rows);
        });
    },

    configure: function(app) {
        app.get('/public/securities', function(req, res, next) {
            self.index(function(err, r) {
                if (err) return next(err);
                res.send(r);
                res.end();
            });
        });
    }
};