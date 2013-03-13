var config = require('konfu')
, RippleIn = require('../lib/ripplein')
, dbClient = require('../lib/db')(config.pg_url)
new RippleIn(dbClient, config.ripple_account)
