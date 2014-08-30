var log = require('./log')(__filename)
, debug = log.debug;

module.exports = function (app, server) {
    "use strict";
    
    var io = require('socket.io').listen(server);
// TODO extends the inativity timeout
//    io.use(function(socket, next) {
//        next();
//      });
    

    
    return io;
};