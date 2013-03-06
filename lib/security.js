var sjcl = require('../vendor/sjcl.js')
var db = require('./db')
, debug = require('debug')('snow:security')

function sign(form, secret) {
    var body = JSON.stringify(form)
    body += secret
    debug('signing body %s with secret %s', body, secret)

    var bits = sjcl.hash.sha256.hash(body)
    return sjcl.codec.base64.fromBits(bits)
}

var self = module.exports = {
    verify: function(req, res, next) {
        if (!req.headers['snow-key']) return next()
        if (req.security && req.security.userId) return next(new Error('request already verified'));

        debug('verifying request');

        var apiKey = req.headers['snow-key'];

        debug('api key is ' + apiKey)

        var client = db();

        client.query({
            text: 'SELECT user_id, secret FROM api_key WHERE api_key_id = $1',
            values: [apiKey]
        }, function(err, dbres) {
            client.end();
            if (err) return next(err);
            if (!dbres.rowCount) return next(new Error('no such api key'))

            var sig = sign(req.body, dbres.rows[0].secret)

            if (sig != req.headers['snow-sign']) {
                debug('sign mismatch, ' + sig.substr(0, 5) + ' != ' + req.headers['snow-sign'].substr(0, 5))
                return res.send(400, 'incorrect message signature');
            }

            debug('message authenticity confirmed');

            (req.security || (req.security = {})).userId = dbres.rows[0].user_id;

            debug('user id is ' + req.security.userId);

            next();
        });
    }
}
