var debug = require('debug')('snow:metrics:exchangerates')
, EventEmitter = require('events').EventEmitter
, util = require('util')
, async = require('async')
, request = require('request')

function ExchangeRates(options) {
	this.options = options;
	this.root = options.firebaseRoot; // firebase url
    this.ratesUrl = options.ratesUrl; // url to markets (https://justcoin.com/api/v1/markets)
    this.startLoop(); // start the worker
}

util.inherits(ExchangeRates, EventEmitter);

ExchangeRates.prototype.startLoop = function() {
    async.forever(function(cb) {
        this.tick(function(err) {
            if (err) return this.emit('error', err)
            setTimeout(cb, 5e3)
        }.bind(this))
    }.bind(this))
}

ExchangeRates.prototype.tick = function(cb) {
    // do request to get exchange rates (JSON) and update firebase
    request(this.ratesUrl, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var data = JSON.parse(body);

            // reformat data to { 'BTCEUR': '800', 'BTCNOK': '7,000' ......... }
            var exchangeRates = {};
            for(var i=0; i<data.length; i++){
                exchangeRates[data[i].id] = numberWithCommas(parseInt(data[i].last, 10).toFixed(0).toString());

            }

            // update firebase
            var ratesRef = this.root.child('stats/exchangeRates');
            debug('current exchange rates: \n' + util.inspect(exchangeRates));
            ratesRef.set(exchangeRates, cb);
        }
        else{
            debug('error: ' + error);
            cb();
        }
    }.bind(this));
};

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

module.exports = ExchangeRates;