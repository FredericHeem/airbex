var log = require('./log')(__filename)
, debug = log.debug;

module.exports = function (app, server) {
    "use strict";
    
    var io = require('socket.io').listen(server);
    
    var router = require('socket.io-events')();
    
    function demand(client, args, next){
        //debug("demand");
        var user = client.user;
        if(!user){
            next({name:"NotAuthenticated"})
        } else {
            next();
        }
    }
    
    function attachUserFromSessionKey(client, args, next){
        if(args.length >= 2 && args[1]){
            log.debug("args ", JSON.stringify(args))
            var message = args[0]
            var param = args[1];
            var sessionKey = param.sessionKey;
            if(sessionKey){
                //debug("message: %s, sessionKey: %s", message, sessionKey);
                app.security.session.getUserAndSessionFromSessionKey(sessionKey,function(err, response){
                    if(err) {
                        return next(err);
                    } else if(response){
                        client.session = response.session
                        client.user = response.user;
                        next();
                    }
                })
            } else {
                next();
            }
        } else {
            next();
        }
    }

    
    function callbackId(args){
        return args[1] ? args[1].callbackId : undefined;
    }
    
    function onError(err, client, args, next){
        var message = args ? args[0]: '';
        log.info("onError: message: %s, callbackId: %s, error: %s",
                message, callbackId(args), JSON.stringify(err));
        client.emit(message, {callbackId: callbackId(args), error:err})
    }
    
    //Must be invoked at end
    function setErrorHandler(){
        router.on(onError);
    }

    
    router.on(attachUserFromSessionKey);
    
    io.use(router);
    
    return {
        io: io,
        router: router,
        demand: demand,
        setErrorHandler: setErrorHandler,
        callbackId:callbackId
    }
};