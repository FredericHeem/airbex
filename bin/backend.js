require('../lib/rest')()
require('../lib/bitcoinedge.txtrack')()
require('../lib/bitcoinedge.sender')()

var RippleIn = require('../lib/ripplein')
, rippleIn = new RippleIn(require('../lib/db'))

require('../lib/rippleout')
