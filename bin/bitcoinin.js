var config = require('konfu')
, BitcoinIn = require('../lib/bitcoinin')
, bitcoinEndPoint = {
    host: config.btc_host,
    port: config.btc_port,
    user: config.btc_user,
    pass: config.btc_pass
}
, dbClient = require('../lib/db')(config.pg_url, config.pg_native)
new BitcoinIn(bitcoinEndPoint, dbClient, config.btc_minconf)
