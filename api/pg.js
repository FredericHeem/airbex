module.exports = function(url, useNative) {
    var pg = require('pg')
    if (useNative) pg = pg['native']
    var client = new pg.Client(url)
    client.connect()
    return client
}
