var restify = require('restify')
, config = require('../config')
, url = require('url')
, debug = require('debug')('snow:rest');

debug('configuring server');

var server = restify.createServer();
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(require('./security').verify);

require('./accounts').configure(server);
require('./users').configure(server);
require('./orders').configure(server);
require('./securities').configure(server);
require('./books').configure(server);
require('./mtgoxRedeem').configure(server);
require('./edges').configure(server)

var port = process.env.PORT || config('port')

debug('listening on ' + port)
server.listen(port)