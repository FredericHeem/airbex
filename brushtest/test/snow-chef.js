/*global require*/
var debug = require('debug')('SnowChef');
var pg = require('pg');
var request = require('supertest');
var async = require('async');

module.exports = function (bot, config) {
    var snowChef = {};
    snowChef.bot = bot;
    snowChef.config = config;
    var maxOpsParallel = 128;
    
    snowChef.securitySession = function (clients, done){
        debug("securitySession #clients %s", clients.length);
        async.forEachLimit(clients, maxOpsParallel, function(client, callback) {
            client.securitySession(function(err, sessionKey) {
                if (err) throw err
                //assert(sessionKey);
                debug("securitySession key %s", sessionKey)
                callback()
            });
        }, function(err) {
            debug("securitySession done: " + err ? err : "");
            done(err);
        });        
    }
    snowChef.balances = function(clients, done) {
        debug("balances #clients %s", clients.length);
        async.forEachLimit(clients, maxOpsParallel, function(client, callback) {
            client.balances(function(err, balances) {
                if (err) throw err
                console.log(client.createTableBalances(balances).toString())
                callback()
            });
        }, function(err) {
            debug("balances done: " + err ? err : "");
            done(err);
        });
    }  
    
    snowChef.orders = function(clients, done) {
        debug("orders #clients %s", clients.length);
        async.forEachLimit(clients, maxOpsParallel, function(client, callback) {
            client.orders(function(err, orders) {
                if (err) throw err
                console.log(client.createTableOrders(orders).toString())
                callback()
            })   
        }, function(err) {
            debug("orders done: " + err);
            done(err);
        });
    }  
    
    snowChef.whoami = function(clients, done) {
        debug("whoami #clients %s", clients.length);
        async.forEachLimit(clients, maxOpsParallel, function(client, callback) {
            client.whoami(function(err, user) {
                if (err) throw err
                console.log(client.createTableUser(user).toString())
                callback()
            });
        }, function(err) {
            debug("whoami done: " + err ? err : "");
            done(err);
        });
    }
    
    snowChef.markets = function(clients, done) {
        debug("markets #clients %s", clients.length);
        async.forEachLimit(clients, maxOpsParallel, function(client, callback) {
            client.markets().then(function(markets) {
                console.log(client.createTableMarkets(markets).toString())
            }).then(done).fail(callback)
        }, function(err) {
            debug("markets done: " + err ? err : "");
            done(err);
        });
    }
    
    snowChef.cancellAllOrders = function(clients, done) {
        debug("cancellAllOrders #clients %s", clients.length);
        async.forEachLimit(clients, maxOpsParallel, function(client, callback) {
           client.cancelAll(function(err) {
                if (err) throw err
                callback()
            });
        }, function(err) {
            debug("cancellAllOrders done: " + err ? err : "");
            done(err);
        });
    }  
    
    snowChef.createAndValidateBankCredit = function(clients, admin, bankCreditInfo, done) {
        debug("createAndValidateBankCredit #clients %s", clients.length);
        async.forEachLimit(clients, maxOpsParallel, function(client, callback) {
           snowChef.bot.createAndValidateBankCredit(admin, client.email, bankCreditInfo, callback) 
        }, function(err) {
            debug("createAndValidateBankCredit done: " + err ? err : "");
            done(err);
        });
    }  
 
    snowChef.creditBTC = function(clients, done) {
        debug("creditBTC #clients %s", clients.length);
        async.forEachLimit(clients, maxOpsParallel, function(client, callback) {
            var amount = "1000000000";
           snowChef.bot.db.creditBTC(client, amount, callback) 
        }, function(err) {
            debug("creditBTC done: " + err ? err : "");
            done(err);
        });
    }  
    
    snowChef.tradeUntillNoFunds = function(clients, order, done) {
        debug("tradeUntillNoFunds #clients %s", clients.length);
        async.forEachLimit(clients, maxOpsParallel, function(client, callback) {
            snowChef.bot.tradeUntillNoFunds(client, order, callback);
        }, function(err) {
            debug("tradeUntillNoFunds done: " + err ? err : "");
            done(err);
        });
    }
    
    snowChef.setDepositAddress = function(clients, done) {
        debug("setDepositAddress #clients %s", clients.length);
        async.forEachLimit(clients, maxOpsParallel, function(client, callback) {
           snowChef.bot.db.setDepositAddress(client.config, "BTC", callback) 
        }, function(err) {
            debug("setDepositAddress done: " + err ? err : "");
            done(err);
        });
    }  
    
    return snowChef;
};