var express = require('express')
, _ = require('underscore')
, debug = require('debug')('snow:web')
, config = require('../../config')

var App = module.exports = function(port) {
    this.app = express();

    this.app.use(express.cookieParser());
    this.app.use(express.bodyParser());

    this.server = require('http').createServer(this.app);

    debug('http server listening on ' + port);

    this.server.listen(port);

    require('./app.assets').configure(this.app);
};

_.extend(App.prototype, {
});