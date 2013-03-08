var BitcoinEdge = require('../bitcoinedge')
, config = require('../../config')
module.exports = new BitcoinEdge({
    endpoint: config.BTC,
    securityId: 'BTC'
})
