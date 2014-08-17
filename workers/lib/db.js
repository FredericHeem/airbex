var log = require('../log')(__filename)
, debug = log.debug
module.exports = function(url, useNative) {
        var pg = useNative ? require('pg')['native'] : require('pg')
    , Client = pg.Client
    , client = new Client(url)
    debug("connecting to db: ")
    client.connect();
    return client
}
