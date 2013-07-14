var activities = module.exports = {}
, _ = require('lodash')
, assert = require('assert')

activities.configure = function(app, conn, auth) {
    app.get('/v1/activities', auth, activities.activities.bind(activities, conn))
}

var detailWhitelist = {
    AddBankAccount: ['accountNumber', 'iban', 'swiftbic', 'routingNumber'],
    VerifyBankAccount: [],
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
    WithdrawComplete: ['amount', 'currency', 'method']
}

activities.activities = function(conn, req, res, next) {
    var query

    if (req.query.since !== undefined) {
        query = {
            text: [
                'SELECT activity_id id, created, "type", details',
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
                'SELECT activity_id id, created, "type", details',
                'FROM activity_web',
                'WHERE user_id = $1',
                'ORDER BY activity_id DESC',
                'LIMIT 20'
            ].join('\n'),
            values: [req.user]
        }
    }

    conn.read.query(query, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(function(row) {
            row.details = JSON.parse(row.details)

            var result = _.pick(row, 'type', 'created')

            // Admin activities are sent as is
            if (row.type.match(/^Admin/)) {
                result.details = row.details
            } else {
                var whitelist = detailWhitelist[row.type]
                assert(whitelist, 'No whitelist entry for ' + row.type)
                result.details = _.pick(row.details, whitelist)
            }

            return result
        }))
    })
}

activities.log = function(conn, userId, type, details, retry) {
    console.log('user #%d activity: %s %j', userId, type, details)
    conn.write.query({
        text: 'INSERT INTO activity (user_id, "type", details) VALUES ($1, $2, $3)',
        values: [userId, type, JSON.stringify(details)]
    }, function(err) {
        if (!err) return
        console.error('Failed to log activity (try #%d)', (retry || 0) + 1)
        console.error(err)
        if (retry == 3) return
        setTimeout(function() {
            activities.log(conn, userId, type, details, (retry || 0) + 1)
        }, 1000)
    })
}
