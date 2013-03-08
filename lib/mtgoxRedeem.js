var db = require('./db')
, config = require('../config')
, mtgox = new (require('mtgox'))(config.mtgox)
, _ = require('underscore');

var self = module.exports = {
    redeem: function(userId, code, cb) {
        if (!userId) return cb(new Error('userId missing'));
        if (!code) return cb(new Error('code missing'));

        mtgox.redeem(code, function(err, currency, reference, status) {
            if (err) return cb(err);
            console.log(arguments)
        });
    },

    configure: function(app) {
        app.post('/private/withdraw/mtgox-redeem', function(req, res, next) {
            self.redeem(req.security.userId, req.params.code, function(err, tranId) {
                if (err) return next(err);
                res.send({ transaction_id: tran_id });
                res.end();
            });
        });
    }
};