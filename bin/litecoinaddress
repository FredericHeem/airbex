var config = require('konfu')
, LitecoinAddress = require('../lib/litecoinaddress')
, ep = {
    host: config.ltc_host,
    port: config.ltc_port,
    user: config.ltc_user,
    pass: config.ltc_pass,
    ssl: config.btc_ssl || false
}
, dbClient = require('../lib/db')(config.pg_url, config.pg_native)
new LitecoinAddress(ep, dbClient)
