require('../lib/rest')()

var BitcoinIn = require('../lib/bitcoinin')
, bitcoinIn = new BitcoinIn()

var BitcoinOut = require('../lib/bitcoinout')
, bitcoinOut = new BitcoinOut()

var RippleIn = require('../lib/ripplein')
, rippleIn = new RippleIn(require('../lib/db'))

var RippleOut = require('../lib/rippleout')
, rippleOut = new RippleOut(require('../lib/db'))
