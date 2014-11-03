var log = require('../log')(__filename)
, debug = log.debug
, _ = require('lodash')
, async = require('async')
, num = require('num')
, dq = require('deferred-queue')
, pg = require('../pg');

module.exports = exports = function(app) {
    exports.app = app
    var config = app.config;
    if(!config.pg_read_url){
        log.error("config.pg_read_url not set");
        return;
    }
    
    app.eventEmitter.on("activity", onActivityWebSocket);
    
    var notifyActivity = app.conn.notifyActivity.get()
    var queueActivity = dq();
    notifyActivity.query('LISTEN "activity_watcher"');
    notifyActivity.on('notification', function(data) {
        log.verbose("activity_watcher", data.payload);
        queueActivity.push(exports.tick);
    });
    
    this.stop = function(){
        debug("stop");
        //clearTimeout(_tickHandle);
    }
    
    this.start = function(){
        debug("start");
        exports.tick();
    }

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
    } else if (row.type == 'CryptoWithdraw') {
        template = 'crypto-withdraw-request'
        locals.amount = stripZeroes(details.amount)
        locals.currency = details.currency
        locals.address = details.address;
        locals.code = details.code;
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
        //log.debug('Not sure how to send activity of type %s', row.type)
        return cb()
    }

    exports.app.eventEmitter.emit("activity", row.user_id, {type: row.type, details: locals})
    
    exports.app.email.send(row.user_id, row.language, template, locals, cb);
}

function onActivityWebSocket(userId, activity){
    debug("onActivityWebSocket userId %s, type %s", userId, activity);
    exports.app.security.sessionWs.getSocketId(userId, function(err, socketId){
        if(err) return;
        if(socketId){
            debug("onActivityWebSocket socketId %s", socketId);
            exports.app.socketio.io.to(socketId).emit('activity', activity);
        } else {
            log.error("onActivityWebSocket: cannot socketId from user id %s", userId);
        }
    })
}

exports.tick = function(cb) {
    log.verbose("tick");
    var query = 'SELECT * FROM pending_email_notify'

    var query = exports.app.conn.read.get().query(query, function(err, dr) {
        if (err) {
            // TODO: Raven
            log.error('Failed to check for new email notifications')
            log.error(err.toString())
            cb && cb(err)
            return;
        }

        debug('processing %s rows', dr.rowCount || 'no')

        async.each(dr.rows, exports.process, function() {
            if (!dr.rowCount) {
                cb && cb()
                return;
            }

            var tip = _.max(dr.rows, 'activity_id').activity_id

            debug('setting tip to %s', tip)

            exports.app.conn.write.get().query({
                text: [
                    'UPDATE settings SET notify_tip = $1',
                    'WHERE notify_tip < $1'
                ].join('\n'),
                values: [tip]
            }, function(err) {
                if (err) {
                    log.error('Failed to set notify tip')
                    log.error(err)
                    cb && cb(err)
                } else {
                    debug('set tip to %s', tip)
                }
                cb && cb()
            })
        })
    })
    query.on('error', function(error){
        log.error("db ", error)
    })
}
