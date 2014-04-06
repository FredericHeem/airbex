var util = require('util')
var debug = require('debug')('snow:api:segment')

module.exports = function(app) {
    var analytics;

    if(app.config.segment_secret){
        analytics = require('analytics-node')
        analytics.init({ secret: app.config.segment_secret })
    }
    else{
        analytics = {
            init: function(options) {
                debug('called segment analytics init');
                debug(util.inspect(options))
            },
            identify: function(options) {
                debug('called segment analytics identify');
                debug(util.inspect(options))
            },
            track: function(options) {
                debug('called segment analytics track');
                debug(util.inspect(options))
            },
            alias: function(options) {
                debug('called segment analytics alias');
                debug(util.inspect(options))
            },
            flush: function(options) {
                debug('called segment analytics flush');
                debug(util.inspect(options))
            }
        }
    }
    return analytics
}