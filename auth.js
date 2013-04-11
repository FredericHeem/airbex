var sjcl = require('./vendor/sjcl')
, Q = require('q')
, auth = module.exports = {}

auth.sign = function(form, secret) {
    var body = JSON.stringify(form) + secret
    , bits = sjcl.hash.sha256.hash(body)
    return sjcl.codec.base64.fromBits(bits)
}

auth.verify = function(conn, req, res, next) {
    var key = req.headers['snow-key']
    if (!key) return next()

    conn.query({
        text: 'SELECT user_id, secret FROM api_key WHERE api_key_id = $1',
        values: [key]
    }, function(err, dres) {
        if (err) return next(err)
        if (!dres.rowCount) return res.send(401, { code: 'UnknownApiKey', message: 'no such api key' })
        var sig = auth.sign(req.body, dres.rows[0].secret)
        if (sig !== req.headers['snow-sign']) return res.send(401, { code: 'BadMessageSignature', message: 'bad message signature' });
        (req.security || (req.security = {})).userId = dres.rows[0].user_id
        next()
    })
}
