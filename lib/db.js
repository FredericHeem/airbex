var _ = require('underscore')
, pg = require('pg')

module.exports = function(url, native) {
    var Client = native ? pg.Client.native : pg.Client
    , client = new Client(url)
    client.connect()
    return client
}
