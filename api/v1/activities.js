var _ = require('lodash')

module.exports = exports = function(app) {
    app.get('/v1/activities', app.auth.primary, exports.index)
}

var detailWhitelist = {
    AddBankAccount: ['accountNumber', 'iban', 'swiftbic', 'routingNumber'],
    RequestEmailVerification: [],
    ChangePassword: [],
    RemoveApiKey: [],
    CreateApiKey: ['canTrade', 'canDeposit', 'canWithdraw'],
    CreateOrder: ['market', 'type', 'price', 'amount', 'aon'],
    CancelOrder: ['id'],
    SendToUser: ['to', 'amount', 'currency', 'code'],
    ReceiveFromUser: ['from', 'amount', 'currency'],
    ConvertBid: ['market', 'amount'],
    UpdateUser: [],
    Created: [],
    IdentitySet: [],
    CreateVoucher: ['currency', 'amount'],
    Withdraw: ['method', 'amount', 'currency', 'address'],
    Credit: ['currency', 'amount'],
    FillOrder: ['market', 'total', 'original', 'type', 'price'],
    WithdrawComplete: ['amount', 'currency', 'method'],
    VerifyBankAccount: ['accountNumber', 'iban']
}

exports.index = function(req, res, next) {
    var query

    if (req.query.since !== undefined) {
        query = {
            text: [
                'SELECT activity_id id, created_at, "type", details',
                'FROM activity_web',
                'WHERE user_id = $1 AND activity_id > $2',
                'ORDER BY activity_id ASC',
                'LIMIT 20'
            ].join('\n'),
            values: [req.user, +req.query.since]
        }
    } else {
        query = {
            text: [
                'SELECT activity_id id, created_at, "type", details',
                'FROM activity_web',
                'WHERE user_id = $1',
                'ORDER BY activity_id DESC',
                'LIMIT 20'
            ].join('\n'),
            values: [req.user]
        }
    }

    req.app.conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(row) {
            row.details = JSON.parse(row.details)

            var result = _.pick(row, 'type', 'id')
            result.created = row.created_at

            // Admin activities are sent as is
            if (row.type.match(/^Admin/)) {
                result.details = row.details
            } else {
                var whitelist = detailWhitelist[row.type]
                if (!whitelist) return null
                result.details = _.pick(row.details, whitelist)
            }

            return result
        }).filter(function(row) {
            return !!row
        }))
    })
}
