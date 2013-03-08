require('../lib/rest')()
require('../lib/bitcoinedge.txtrack')()
require('../lib/bitcoinedge.sender')()

var RippleIn = require('../lib/ripplein')
, rippleIn = new RippleIn(require('../lib/db'))

var RippleOut = require('../lib/rippleout')
, rippleOut = new RippleOut(require('../lib/db'))
