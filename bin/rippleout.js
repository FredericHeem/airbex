var config = require('konfu')
, RippleOut = require('../lib/rippleout')
, dbClient = require('../lib/db')(config.pg_url)
new RippleOut(dbClient, config.ripple_account, config.ripple_secret)
