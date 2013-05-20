var debug = require('debug')('snow:keys')
, validate = require('./validate')
, keys = module.exports = {}

keys.configure = function(app, conn, auth) {
    app.post('/v1/keys/replace', auth, keys.replace.bind(keys, conn))
}

keys.replace = function(conn, req, res, next) {
    if (!validate(req.body, 'keys_replace', res)) return
    conn.write.query({
        text: 'SELECT replace_api_key($1, $2)',
        values: [req.key, req.body.key]
    }, function(err) {
        if (err) return next(err)
        res.send(200, {})
    })
}
