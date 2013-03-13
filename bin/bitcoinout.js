var config = require('konfu')
, BitcoinOut = require('../lib/bitcoinout')
, bitcoinEndPoint = {
    host: config.btc_host,
    port: config.btc_port,
    user: config.btc_user,
    pass: config.btc_pass
}
, dbClient = require('../lib/db')(config.pg_url)
new BitcoinOut(bitcoinEndPoint, dbClient)
