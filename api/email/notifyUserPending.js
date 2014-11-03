var log = require('../log')(__filename)
, debug = log.debug
, _ = require('lodash')
, async = require('async')
, num = require('num')
, dq = require('deferred-queue')
, pg = require('../pg');

module.exports = exports = function(app) {
    exports.app = app;
    var config = app.config;
    if(!config.pg_read_url){
        log.error("config.pg_read_url not set");
        return;
    }
    
    this.stop = function(){
        debug("stop");
        //clearTimeout(_tickHandle);
    }
    
    this.start = function(){
        debug("start");
        exports.tickUserPending();
    }
    
    
    
    var notifyUserPending = app.conn.notifyUserPending.get()
    
    var queueUserPending = dq(1);
    notifyUserPending.query('LISTEN "user_pending_watcher"');
    notifyUserPending.on('notification', function(data) {
        debug("user_pending_watcher", JSON.stringify(data));
        queueUserPending.push(exports.tickUserPending);
    });
}

exports.processUserPending = function(row, cb) {
    var language = 'en-US';

    debug("sending email to %s", row.email)
    if(exports.app.config.smtp){
        exports.app.email.send(row.email, language, 'verify-email', { code: row.code }, function(err) {
            debug("email sent")
            if (err)  {
                log.error("ERROR sending email")
                return cb(err)
            } else {
                exports.app.conn.write.get().query({
                    text: [
                           "UPDATE user_pending SET state ='emailsent'",
                           'WHERE email=$1'
                           ].join('\n'),
                           values: [row.email]
                }, function(err) {
                    if (err) {
                        log.error('Failed to set user_pending state')
                        log.error(err)
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

exports.tickUserPending = function(cb) {
    debug('tickUserPending')

    var query = "SELECT * FROM user_pending where state='created'"

    var query = exports.app.conn.read.get().query(query, null, function(err, dr) {
        if (err) {
            // TODO: Raven
            log.error('tickUserPending Failed to check for pending user')
            log.error(err.toString())
            cb && cb(err)
            return 
        }

        debug('tickUserPending processing %s rows', dr.rowCount || 'no')

        async.each(dr.rows, exports.processUserPending, function() {
            if (!dr.rowCount) {
                //debug('no user pending mail to send')
            } 
            cb && cb();
        })
        
    })
    query.on('error', function(error){
        log.error("db ", error)
    })
}

