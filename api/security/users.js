var _ = require('lodash')

function formatRow(row) {
    return {
        id: row.user_id,
        admin: row.admin,
        email: row.email,
        canTrade: row.can_trade,
        canDeposit: row.can_deposit,
        canWithdraw: row.can_withdraw,
        suspended: row.suspended,
        tfaSecret: row.two_factor,
        securityLevel: row.security_level,
        primaryKey: row.primary_api_key_id
    }
}

module.exports = exports = function(app) {
    exports.app = app
    return exports
}

var userQuery = [
    'SELECT',
    '   a.user_id,',
    '   u.admin,',
    '   u.email,',
    '   u.security_level,',
    '   u.two_factor,',
    '   u.suspended,',
    '   a.can_withdraw,',
    '   a.can_deposit,',
    '   pa.api_key_id primary_api_key_id,',
    '   a.can_trade',
    'FROM api_key a',
    'INNER JOIN user_view u ON u.user_id = a.user_id',
    'INNER JOIN api_key pa ON pa.user_id = u.user_id AND pa.primary = TRUE'
].join('\n')

exports.query = function(condition, value, cb) {
    exports.app.conn.read.get().query({
        text: [
            userQuery,
            condition
        ].join('\n'),
        values: [value]
    }, function(err, dr) {
        if (err) return cb(err)
        if (!dr.rowCount) return cb()
        var user = formatRow(dr.rows[0])
        cb(null, user)
    })
}

exports.fromUserId = function(id, cb) {
    exports.query('WHERE u.user_id = $1 AND a.primary = TRUE', id, cb)
}

exports.fromEmail = function(email, cb) {
    exports.query('WHERE u.email_lower = $1 AND a.primary = TRUE', email, cb)
}

exports.fromApiKey = function(key, cb) {
    exports.query('WHERE a.api_key_id = $1 AND a.primary = FALSE', key, function(err, user) {
        if (err) return cb(err)
        if (!user) return cb()
        return cb(null, _.extend({
            id: key,
            userId: user.id
        }, _.pick(user, 'canTrade', 'canDeposit', 'canWithdraw')))
    })
}
