module.exports = function(url, useNative) {
	var pg = useNative ? require('pg')['native'] : require('pg')
    , Client = pg.Client
    , client = new Client(url)
    client.connect()
    return client
}
