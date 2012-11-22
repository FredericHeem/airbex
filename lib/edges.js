var config = require('../config')
, edges = module.exports = {
    configure: function(app) {
        var BitcoinEdge = require('./bitcoinedge')
        edges.BTC = new BitcoinEdge({
            securityId: 'BTC',
            endpoint: config('BTC')
        });
        edges.BTC.configure(app)
    }
}