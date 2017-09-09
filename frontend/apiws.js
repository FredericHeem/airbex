var Airbex = require('airbex-client');
var debug = require('./helpers/debug')('apiws');

var ApiWs = function(eventEmitter) {
    "use strict";
    var  ws;
    var loggedIn = false;
    this.start = function () {
        debug('start');
        var url = window.location.protocol + "//" + window.location.host;
        ws = new Airbex.WebSocketClient({url:url});
//        ws.on('/v1/currencies', function(error, currencies){
//            api.onCurrencies(currencies)
//        });

        ws.on('connected', onConnected.bind(this));
        ws.on('connect_error', onConnectError.bind(this));
        ws.on('error', onError.bind(this));
        
        ws.start();
        
        ws.getIo().on('activity', function(msg){
            console.log('getIo activity message: ' + msg);
            onActivity(msg)
        });
    }
    
    this.onWebSocket = function(event, handler){
        ws.getIo().on(event, handler);
    }
    
    this.offWebSocket = function(event, handler){
        ws.getIo().off(event, handler);
    }
    
    this.on = function(event, handler){
        //debug('on ', event);
        eventEmitter.on(event, handler)
    }

    this.once = function(event, handler){
        //debug('once ', event);
        eventEmitter.once(event, handler)
    }
    
    this.off = function(event, handler){
        //debug('off ', event);
        eventEmitter.removeListener(event, handler)
    }
    
    this.trigger = function(event, param){
        //debug('trigger ', event);
        //debug(util.inspect(eventEmitter.listeners(event)));
        eventEmitter.emit(event, param)
    }
    
    function onActivity(activity){
        var activityText = require('./helpers/activity')(activity);
        if(activityText){
            alertify.log(activityText);
        }
    }
    
    function onConnectError(){
        debug('connect_error');
        eventEmitter.emit('connect_error')
    }

    function onError(error){
        debug('onError ', JSON.stringify(error));
        if (error.name == 'SessionNotFound' && loggedIn) {
            $.removeCookie('session', { path: '/' })
            location.reload()
        } else if(error.name == 'OtpRequired'){
            api.sessionKeySave(ws.getSessionKey());
        }
    }

    function onConnected(){
        debug('onConnected');
        var me = this;
        eventEmitter.emit('connected');
        ws.getCurrencies()
        .then(function(currencies){
            api.onCurrencies(currencies);
            return ws.getMarkets()
        })
        .then(function(markets){
            ws.on('/v1/markets', function(error, markets){
                api.onMarkets(markets)
            });
            
            api.onMarkets(markets);
            eventEmitter.emit('bootstrapDone');
        })
        .then(function(){
            loginAttempt(me);
        })
        .fail(function(error){
            debug('bootstrap error: ', error);
        })
    }
    
    function loginAttempt(me){
        debug("loginAttempt");
        
        var sessionCookie = $.cookie('session');
        if (sessionCookie) {
            debug('using existing session')
             me.loginWithSessionKey(sessionCookie)
            .fail(function(error) {
                debug('failed to reuse existing session: ', error)
                $.removeCookie('session')
            })
            .fin(function(){
                router.now()
            })
        } else {
            debug('loc: %s', window.location.hash)
            var emailCode = window.location.hash.match(/^#([a-z0-9]{20})$/)
            var withdrawCode = window.location.hash.match(/^#withdraw\/([a-z0-9]{20})$/)
            debug('email code: %s, withdraw code %s', emailCode, withdrawCode)
            
            if ($.cookie('existingUser') && !emailCode && !withdrawCode) {
                debug('routing to login (existing user cookie)')
                require('./authorize').user()
            } else {
                debug('routing')
                router.now()
            }
        }
    }
    
    function loginDone(me, response){
        debug('loginDone user ', response.user);
        //debug('loginDone balances ', response.balances);
        loggedIn = true;
        me.sessionKeySave(response.sessionKey)
        me.trigger('user', response.user);
        api.onBalances(response.balances);
        api.onMarketsInfo(response.marketsInfo);
    }
    
    this.loginWithUserKey = function(email, userKey) {
        debug('loginWithUserKey for %s', email);
        var me = this;
        return ws.loginWithUserKey(email, userKey)
        .then(function(response){
            loginDone(me, response)
            return response;
        })
    }
    
    this.loginWithSessionKey = function(sessionKey) {
        debug('loginWithSessionKey');
        var me = this;
        return ws.loginWithSessionKey(sessionKey)
        .then(function(response){
            loginDone(me, response)
            return response;
        })
    }
    
    this.fetchMarkets = function() {
        debug('fetchMarkets');
        return ws.getMarkets()
        .then(function(markets){
            api.onMarkets(markets);
        })
        .fail(function(error){
            debug('markets error: %s', JSON.stringify(error));
        })
    }

    this.fetchBalances = function() {
        debug('fetchBalances');
        return ws.getBalances()
        .then(function(balances){
            api.onBalances(balances);
        })
        .fail(function(error){
            debug('balances error: %s', JSON.stringify(error));
        })
    }
    
    this.depth = function(marketId) {
        debug('depth ', marketId);
        ws.getDepth(marketId)
        .then(function(depth){
            api.onDepth(depth);
        })
        .fail(function(error){
            debug('depth error: %s', error.toString());
        })
    }
}

module.exports = ApiWs;