var config = require('konfu')
, LitecoinOut = require('../lib/litecoinout')
, ep = {
    host: config.ltc_host,
    port: config.ltc_port,
    user: config.ltc_user,
    pass: config.ltc_pass,
    ssl: config.ltc_ssl || false
}
, dbClient = require('../lib/db')(config.pg_url, config.pg_native)
new LitecoinOut(ep, dbClient)
