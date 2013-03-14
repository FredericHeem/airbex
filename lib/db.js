var _ = require('underscore')

module.exports = function(url, native) {
	var pg = native ? require('pg').native : require('pg')
    , Client = pg.Client
    , client = new Client(url)
    client.connect()
    return client
}
