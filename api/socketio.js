var log = require('./log')(__filename)
, debug = log.debug;

var Router = function(io){
    
    var defaultFunctions = [];
    var errorCb;
      
    this.onDefault = function(cb){
        defaultFunctions.push(cb)
    }
    
    this.onError = function(cb){
        errorCb = cb
    }

    function onEvent(socket, index, functions, eventName, data){
        //debug("Router.onEvent eventName: %s, index %s/%s", eventName, index, functions.length);
        
        function next(error){
            if(error){
                //debug("Router next error: %s", error)
                if(errorCb){
                    errorCb(error, socket, eventName, data);
                }
            } else {
                index++;
                //debug("Router next index %s", index);
                if(index < functions.length){
                    onEvent(socket, index, functions, eventName, data)
                } else {
                    debug("Router done");
                }
            }
           
        }
        
        functions[index](socket, eventName, data, next);
    }
    
    this.on = function(eventName){
        if(arguments.length < 2){
            throw new Error('missing handler handler');
        }
        
        var functions = Object.create(defaultFunctions);
        
        for(var i = 1; i < arguments.length; i++){
            functions.push(arguments[i])
        }
        
        //debug("Router.on %s has %s cb, #defaults %s", eventName, functions.length, defaultFunctions.length);
        
        io.on('connection', function (socket) {
            socket.on(eventName, function (data) {
                console.log(data);
                onEvent(socket, 0, functions, eventName, data);
            });
        });
    }
}

module.exports = function (app, server) {
    "use strict";
    exports.app = app;
    var io = require('socket.io').listen(server);
    
    var router = new Router(io);
    
    function demand(client, eventName, data, next){
        //debug("demand");
        var user = client.user;
        if(!user){
            return next({name:"NotAuthenticated", message:'Not Authenticated'})
        }
        if (user.tfaSecret && !client.session.tfaPassed){
            debug('session is primary, user has 2fa enabled, but 2fa is not passed')
            return next({
                name: 'OtpRequired',
                message: 'Two-factor authentication is required for this account'
            })
        }
        
        next();
    }
    
    function attachUserFromSessionKey(client, eventName, data, next){
        if(data && data.header && data.header.sessionKey && !client.user){
            //log.debug("attachUserFromSessionKey eventName %s, data: %s", eventName, JSON.stringify(data))
            var sessionKey = data.header.sessionKey;
            app.security.session.getUserAndSessionFromSessionKey(sessionKey,function(err, response){
                if(err) {
                    return next(err);
                } else if(response){
                    client.session = response.session
                    client.user = response.user;
                    //log.debug("attachUserFromSessionKey: %s", client.user);
                    app.security.sessionWs.create(response.user.id, client.id,function(err){
                        if(err) return next(err);
                        next();
                    });
                } else {
                    next();
                }
            })
        } else {
            next();
        }
    }

    function attachUserFromApiKey(client, eventName, data, next){
        if(data && data.header && data.header.apiKey && !client.user){
            //log.debug("attachUserFromApiKey eventName %s, data: %s", eventName, JSON.stringify(data))
            var apiKey = data.header.apiKey;
            app.security.keys.getUserFromApiKey(apiKey,function(err, response){
                if(err) {
                    return next(err);
                } else if(response){
                    //log.debug("attachUserFromApiKey: message: %s, %s", eventName, JSON.stringify(response));
                    client.user = response.user;
                    app.security.sessionWs.create(response.user.id, client.id, function(err){
                        if(err) return next(err);
                        next();
                    });
                } else {
                    next()
                }
                
            })
        } else {
            next();
        }
    }
    
    function onMessage(client, eventName, data, next){
        log.debug("onMessage ", eventName);
        next()
    }
    
    function callbackId(data){
        if(data){
            var header = data.header;
            if(header){
                return header.callbackId
            }
        }
        return undefined;
    }
    
    function onError(err, client, eventName, data, next){
        var message = eventName ? eventName: '';
        log.info("onError: message: %s, callbackId: %s, error: %s",
                message, callbackId(data), JSON.stringify(err));
        client.emit(message, {message: message, callbackId: callbackId(data), error:err})
    }
    
    //router.onDefault(onMessage);
    router.onDefault(attachUserFromSessionKey);
    router.onDefault(attachUserFromApiKey);
    router.onError(onError);
    
    return {
        io: io,
        router: router,
        demand: demand,
        callbackId:callbackId
    }
};