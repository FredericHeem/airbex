var log = require('../log')(__filename)
, debug = log.debug
, _ = require('lodash')
, async = require('async')
, num = require('num')
, dq = require('deferred-queue')
, pg = require('../pg')
, marketOps = require('../v1/markets')
, Q = require('q')

var _tickHandle;
var _marketsSummary;
var _depths = {};

module.exports = exports = function(app) {
    exports.app = app
    var config = app.config;
    if(!config.pg_read_url){
        log.error("config.pg_read_url not set");
        return;
    }
    
    this.stop = function(){
        debug("stop");
        clearTimeout(_tickHandle);
    }
    
    this.start = function(){
        debug("start");
        exports.tick();
    }
}

var marketsGet = function() {
    //debug("marketGet");
    var deferred = Q.defer();
    marketOps.marketsGet(exports.app, null, function(err, marketsSummary){
        if(err) {
            log.error("Cannot get markets", err);
            return deferred.reject(err);
        }

        if(!_.isEqual(_marketsSummary, marketsSummary)){
            //debug(JSON.stringify(marketsSummary));
            _marketsSummary = marketsSummary;
            exports.app.socketio.io.emit('/v1/markets', {data:marketsSummary});
        }

        deferred.resolve();
    })
    return deferred.promise;
}

var depthGet = function(market) {
    //debug("depthGet ", market.name);
    var marketName = market.name;
    
    var deferred = Q.defer();
    marketOps.depthGet(exports.app, {marketId:marketName}, function(err, depth){
        if(err) {
            log.error("Cannot get depth: ", err.toString());
            return deferred.reject(err);
        }
        
        if(!_.isEqual(_depths[marketName], depth)){
            //debug(JSON.stringify(depth));
            _depths[marketName] = depth;
            exports.app.socketio.io.emit('/v1/markets/' + marketName + '/depth', {data:depth});
        }
        
        deferred.resolve();
    })
    return deferred.promise;
}

var depthsGet = function() {
    //debug("depthGet");
    return Q.all(_.map(exports.app.cache.markets, function(market){
        return depthGet(market);
    }))
}


exports.tick = function(cb) {
    debug("tick");
    Q.all([marketsGet(), depthsGet()])
    .then(function(){
    })
    .fin(function(){
        debug("tick done");
        _tickHandle = setTimeout(exports.tick, 5e3);
    })
}

