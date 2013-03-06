var debug = require('debug')('snow:transactions')
, util = require('util')
, Q = require('q')

var rippleout = module.exports = {
    db: require('../db'),

    enqueue: function(userId, securityId, address, amount, cb) {
        if (!userId) return cb(new Error('userId missing'))
        debug('finding %s account for user %s', securityId, userId)

        var client = rippleout.db()
        Q.ninvoke(client, 'query', {
            text: 'SELECT user_security_account($1, $2)',
            values: [userId, securityId]
        })
        .get('rows').get(0).get('user_security_account')
        .then(function(accountId) {
            debug('withdrawing %s to %s', amount, address)
            return Q.ninvoke(client, 'query', {
                text: 'SELECT ripple_withdraw($1, $2, $3)',
                values: [accountId, address, amount]
            })
        })
        .then(function(res) {
            cb(null, res)
        })
        .fail(cb)
        .fin(function() {
            client.end()
        })
        .done()
    },

    configure: function(app) {
        app.post('/private/rippleout', function(req, res, next) {
            rippleout.enqueue(
                req.security.userId,
                req.body.securityId,
                req.body.address,
                +req.body.amount,
                function(err, id) {
                    if (err) return next(err);
                    res.send(200, {})
                }
            )
        })
    }
}
