require('./rest')
require('./bitcoinin')

var BitcoinOut = require('../lib/bitcoinout')
, bitcoinOut = new BitcoinOut()

var RippleIn = require('../lib/ripplein')
, rippleIn = new RippleIn(require('../lib/db'))

var RippleOut = require('../lib/rippleout')
, rippleOut = new RippleOut(require('../lib/db'))
