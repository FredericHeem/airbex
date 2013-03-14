var config = require('konfu')
, RippleIn = require('../lib/ripplein')
, dbClient = require('../lib/db')(config.pg_url, config.pg_native)
new RippleIn(dbClient, config.ripple_account)
