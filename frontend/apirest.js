module.exports = function() {
    "use strict";
    var apirest = {}
    , debug = require('./helpers/debug')('apirest')
    
    apirest.start = function(){
    }

    api.loginWithUserKey = function(email, userKey) {
        debug('creating session for %s', email)
        return api.call('security/session', { email: email }, { authorizing: true })
        .then(function(res) {
            debug('retrieved session id: %s', res.id)
            var key = api.keyFromUserKey(res.id, userKey)
            return api.loginWithSessionKey(key)
        })
    }
    
    api.loginWithSessionKey = function(key) {
        api.sessionKeySave(key);
        return api.call('v1/whoami', null, { authorizing: true })
        .then(function(user) {
            api.onUser(user)
        })
    }
    
    apirest.currencies = function() {
        return api.call('v1/currencies')
        .done(function(currencies) {
            api.onCurrencies(currencies)
        })
    }
    
    apirest.balances = function() {
        return api.call('v1/balances')
        .done(function(balances) {
            api.onBalances(balances)
        })
    }
    
    apirest.markets = function() {
        return api.call('v1/markets')
        .then(function(markets) {
            api.onMarkets(markets)
        })
    }
    
    apirest.depth = function(id) {
        debug('depth for %s: ', id)
        return api.call('v1/markets/' + id + '/depth')
        .then(function(depth) {
            return api.onDepth(depth)
        })
    }
    return apirest;
}