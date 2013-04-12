var config = require('konfu')
, express = require('express')
, app = express()
, http = require('http')
, server = http.createServer(app)
, conn = require('./db')(config.pg_url, config.pg_native)
, raven = require('raven')
, auth = require('./auth')

app.config = config

// access control headers (for hosting on s3)
app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    res.header('Access-Control-Allow-Headers', 'snow-key,snow-sign,Content-Type')
    res.header('Access-Control-Max-Age', 60 * 60 * 24 * 365)
    return req.method == 'OPTIONS' ? res.send(200) : next()
})

app.use(express.bodyParser())
app.use(auth.verify.bind(auth, conn))

var routes = ['accounts', 'books', 'orders', 'ripple',
'securities', 'transactions', 'users', 'transfer']
routes.forEach(function(name) {
	require('./' + name).configure(app, conn)
})

// can be used for other bitcoin derived, such as litecoin
require('./bitcoin').configure(app, conn, 'BTC')

app.use(function(req, res) {
	res.send(404)
})

raven.middleware.connect(config.raven)
server.listen(config.port)
