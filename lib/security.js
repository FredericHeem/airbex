var db = require('./db')
, crypto = require('crypto')
, debug = require('debug')('snow:security')
, qs = require('querystring')
, self = module.exports = {
    verify: function(req, res, next) {
        if (!req.headers['snow-version']) return next();
        if (!req.headers['snow-nonce']) return res.send(400, 'snow-nonce header missing');
        if (!req.headers['snow-key']) return res.send(400, 'api key missing');
        if (+req.headers['snow-version'] !== 1) return res.send(400, 'unsupported version');
        if (req.security && req.security.userId) return next(new Error('request already verified'));

        debug('verifying request');

        var nonce = req.headers['snow-nonce'];

        var apiKey = req.headers['snow-key'];
        var client = db();

        client.query({
            text: 'SELECT user_id, secret FROM api_key WHERE api_key_id = $1',
            values: [apiKey]
        }, function(err, dbres) {
            client.end();
            if (err) return next(err);
            if (!dbres.rowCount) return next(new Error('no such api key'));

            var body = req.body || '';

            debug('body is ' + body);

            var sec_key_buffer = Buffer(dbres.rows[0].secret, 'base64');
            debug('secret is', dbres.rows[0].secret);
            var hmac = crypto.createHmac('sha512', sec_key_buffer);
            hmac.update(body);
            hmac.update(nonce);
            var sign = hmac.digest('base64');

            if (sign != req.headers['snow-sign']) {
                debug('sign mismatch, ' + sign.substr(0, 5) + ' <> ' + req.headers['snow-sign'].substr(0, 5));
                return res.send(400, 'incorrect message signature');
            }

            debug('message authenticity confirmed');

            (req.security || (req.security = {})).userId = dbres.rows[0].user_id;

            debug('user id is ' + req.security.userId);

            next();
        });
    }
};