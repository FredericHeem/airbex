var config = require('konfu')
, BitcoinAddress = require('../lib/bitcoinaddress')
, bitcoinEndPoint = {
    host: config.btc_host,
    port: config.btc_port,
    user: config.btc_user,
    pass: config.btc_pass
}
, dbClient = require('../lib/db')(config.pg_url)
new BitcoinAddress(bitcoinEndPoint, dbClient)
