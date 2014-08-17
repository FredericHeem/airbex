var log = require('../log')(__filename)
, debug = log.debug
, _ = require('lodash')
, async = require('async')
, num = require('num')

module.exports = exports = function(app) {
    exports.app = app
    exports.schedule()
    exports.scheduleUserPending()
}

function stripZeroes(x) {
    return ~x.indexOf('.') ? x.replace(/\.?0+$/, '') : x
}

function getBidAmountWithFee(amount, scale, fee_ratio){
    var amountWithFee = num(amount).set_precision(scale + 4);
    return amountWithFee.mul(num("1").add(fee_ratio)).round(scale);
}

function getAskAmountWithFee(amount, scale, fee_ratio){
    var amountWithFee = num(amount).set_precision(scale + 4);
    return amountWithFee.mul(num("1").sub(fee_ratio)).round(scale);
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
        locals.filled = stripZeroes(details.filled || details.original);
        locals.base = exports.app.cache.getBaseCurrency(details.market)
        var baseScale = exports.app.cache.getCurrencyScaleDisplay(locals.base)
        locals.quote = exports.app.cache.getQuoteCurrency(details.market)
        var quoteScale = exports.app.cache.getCurrencyScaleDisplay(locals.quote)
        locals.price = details.price ? stripZeroes(details.price) : null
        var fee_ratio = details.fee_ratio ? details.fee_ratio : 0;
        if(details.type == 'bid'){
        	var total = getBidAmountWithFee(details.total, quoteScale, fee_ratio);
            locals.total = stripZeroes(total.toString())
            locals.original = stripZeroes(details.original)
        } else {
            locals.total = stripZeroes(getAskAmountWithFee(details.total, quoteScale, fee_ratio).toString())
            locals.original = stripZeroes(details.original)
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

exports.scheduleUserPending = function() {
    // TODO: Remove magic number
    return setTimeout(exports.tickUserPending, 5e3)
}

exports.processUserPending = function(row, cb) {
	var language = 'en-US';

	debug("sending email to %s", row.email)
	if(exports.app.config.smtp){
		exports.app.email.send(row.email, language, 'verify-email', { code: row.code }, function(err) {
			debug("email sent")
			if (err)  {
				debug("ERROR sending email")
				return cb(err)
			} else {
	            exports.app.conn.write.query({
	                text: [
	                    "UPDATE user_pending SET state ='emailsent'",
	                    'WHERE email=$1'
	                ].join('\n'),
	                values: [row.email]
	            }, function(err) {
	                if (err) {
	                    console.error('Failed to set user_pending state')
	                    console.error(err)
	                    cb(err)
	                } else {
	                    debug('set email state for %s', row.email)
	                    cb()
	                }
	            })
			}
			
		})
	} else {
		debug("smtp not configured")
		cb("smtp not configured")
	}
}

exports.tickUserPending = function() {
    debug('tickUserPending')

    var query = "SELECT * FROM user_pending where state='created'"

    exports.app.conn.read.query(query, function(err, dr) {
        if (err) {
            // TODO: Raven
            console.error('tickUserPending Failed to check for new email notifications')
            console.error(err)
            return exports.scheduleUserPending()
        }

        debug('tickUserPending processing %s rows', dr.rowCount || 'no')

        async.each(dr.rows, exports.processUserPending, function() {
            if (!dr.rowCount) {
            	debug('no user pending mail to send')
            } 
            exports.scheduleUserPending()
        })
        
    })
}

