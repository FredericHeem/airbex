var config = require('konfu')
, LitecoinIn = require('../lib/litecoinin')
, ep = {
    host: config.ltc_host,
    port: config.ltc_port,
    user: config.ltc_user,
    pass: config.ltc_pass,
    ssl: config.ltc_ssl || false
}
, dbClient = require('../lib/db')(config.pg_url, config.pg_native)
new LitecoinIn(ep, dbClient, config.ltc_minconf || 6)
