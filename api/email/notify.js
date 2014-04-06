var debug = require('debug')('snow:email:notify')
, _ = require('lodash')
, async = require('async')
, num = require('num')

module.exports = exports = function(app) {
    exports.app = app
    exports.schedule()
}

function stripZeroes(x) {
    return ~x.indexOf('.') ? x.replace(/\.?0+$/, '') : x
}

exports.process = function(row, cb) {
    var template
    , locals = {
        userId: row.user_id,
        firstName: row.first_name,
        language: row.language,
        email: row.email
    }

    var details = row.details = JSON.parse(row.details)

    
    if (row.type == 'FillOrder') {
        template = 'fill-order'
        locals.market = details.market
        locals.type = details.type
        locals.base = details.market.substr(0, 3)
        locals.quote = details.market.substr(3)
        locals.price = details.price ? stripZeroes(details.price) : null
        var fee_ratio = details.fee_ratio ? details.fee_ratio : 0;
        if(details.type == 'bid'){
            var total = num(details.total).mul(num("1").add(fee_ratio))
            total.set_precision(5)
            locals.total = parseFloat(total.toString()).toFixed(2)
            locals.original = stripZeroes(details.original)
        } else {
            locals.total = stripZeroes(details.total)
            var original = num(details.original).mul(num("1").add(fee_ratio))
            original.set_precision(8)
            locals.original = original.toString()
        }
        
    } else if (row.type == 'WithdrawComplete') {
        template = 'withdraw-complete'
        locals.amount = stripZeroes(details.amount)
        locals.currency = details.currency
        locals.method = details.method
    } else if (row.type == 'ReceiveFromUser') {
        template = 'receive-from-user'
        locals.from = details.from
        locals.amount = stripZeroes(details.amount)
        locals.currency = details.currency
    } else if (row.type == 'Credit') {
        template = 'credit'
        locals.amount = stripZeroes(details.amount)
        locals.currency = details.currency
    } else if (row.type == 'KycCompleted') {
        template = 'kyc-completed'
    } else if (row.type == 'ChangePassword') {
        template = 'change-password'
    } else if (row.type == 'EnableTwoFactor') {
        template = 'enable-two-factor'
    } else if (row.type == 'RemoveTwoFactor') {
        template = 'remove-two-factor'
    } else if (row.type == 'BTCWithdraw') {
        template = 'crypto-withdraw-request'
        locals.amount = stripZeroes(details.amount)
        locals.currency = 'BTC'
        locals.address = details.address;
    } else if (row.type == 'WithdrawRequest') {
        template = 'withdraw-request'
        locals.amount = stripZeroes(details.amount)
        locals.currency = details.currency
        locals.method = details.method
    } else if (row.type == 'ApiKeyCreate') {
        template = 'apikey-create'
    }
    
    if (!template) {
        // TODO: Raven
        console.error('Not sure how to send activity of type %s', row.type)
        return cb()
    }

    exports.app.email.send(row.user_id, row.language, template, locals, cb)
}

exports.schedule = function() {
    // TODO: Remove magic number
    return setTimeout(exports.tick, 15e3)
}

exports.tick = function() {
    debug('ticking...')

    var query = 'SELECT * FROM pending_email_notify'

    exports.app.conn.read.query(query, function(err, dr) {
        if (err) {
            // TODO: Raven
            console.error('Failed to check for new email notifications')
            console.error(err)
            return exports.schedule()
        }

        debug('processing %s rows', dr.rowCount || 'no')

        async.each(dr.rows, exports.process, function() {
            if (!dr.rowCount) {
                // TODO: Remove magic number
                return exports.schedule()
            }

            var tip = _.max(dr.rows, 'activity_id').activity_id

            debug('setting tip to %s', tip)

            exports.app.conn.write.query({
                text: [
                    'UPDATE settings SET notify_tip = $1',
                    'WHERE notify_tip < $1'
                ].join('\n'),
                values: [tip]
            }, function(err) {
                if (err) {
                    console.error('Failed to set notify tip')
                    console.error(err)
                } else {
                    debug('set tip to %s', tip)
                }

                exports.schedule()
            })
        })
    })
}
