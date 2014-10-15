var log = require('../log')(__filename)
, debug = log.debug
, _ = require('lodash')
, async = require('async')
, num = require('num')
, dq = require('deferred-queue')
, pg = require('../pg')
, market = require('../v1/markets')

var _marketsSummary;

module.exports = exports = function(app) {
    exports.app = app
    var config = app.config;
    if(!config.pg_read_url){
        log.error("config.pg_read_url not set");
        return;
    }
    
    exports.tick();
}

var marketsGet = function(cb) {
    //debug("marketGet");
    market.marketsGet(exports.app, null, function(err, marketsSummary){
        if(err) {
        log.error("Cannot get markets", err);
            return cb(err);
        }
        
        if(!_.isEqual(_marketsSummary, marketsSummary)){
            debug(JSON.stringify(marketsSummary));
            _marketsSummary = marketsSummary;
            exports.app.socketio.io.emit('/v1/markets', {data:marketsSummary});
        }
        
        cb()
    })
}

exports.tick = function(cb) {
    //debug("market tick");
    
    marketsGet(function(err){
        setTimeout(exports.tick, 5e3);
    })
}

