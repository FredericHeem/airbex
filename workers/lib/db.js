var debug = require('debug')('snow:db')
module.exports = function(url, useNative) {
        var pg = useNative ? require('pg')['native'] : require('pg')
    , Client = pg.Client
    , client = new Client(url)
    debug("connecting to db: ")
    client.connect();
    return client
}
