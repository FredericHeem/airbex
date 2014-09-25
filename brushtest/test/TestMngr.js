var debug = require('debug')('TestMngr');
var Q = require("q");
var SnowBot = require('./snow-bot');
var SnowChef = require('./snow-chef');
var SnowClient = require('../../client/index');

var TestMngr = function(config){
    debug("TestMngr ", JSON.stringify(config, null, 4));
    var clientsMap = {};
    var clients = [];
    var clientsConfig = {};
    var snowBot = new SnowBot(config);
    var snowChef = new SnowChef(snowBot, config);
    
    config.users.forEach(function(userConfig){
        userConfig.url = config.url; 
        var client = new SnowClient(userConfig);
        clientsMap[userConfig.name] = client;
        clientsConfig[userConfig.name] = userConfig;
        clients.push(client);
    })
    
    this.bot = function(){
        return snowBot;
    }
    
    this.chef = function(){
        return snowChef;
    }
    
    this.client = function(name){
        return clientsMap[name];
    }
    
    this.clientConfig = function(name){
        return clientsConfig[name];
    }
    
    this.dbConnect = function(){
        var deferred = Q.defer();
        snowBot.db.pgClient.connect(function(err) {
            if (err) {
                debug("db connect error: %s, connection: %s", err, config.pg_write_url);
                deferred.reject(err)
                
            } else {
                debug("db connected");
                deferred.resolve();
            }
        });
        return deferred.promise;
    }
    
    this.login = function(){
        var deferred = Q.defer();
        snowChef.securitySession(clients, function(err){
            if(err) return deferred.reject(err)
            deferred.resolve()
            
        })
        return deferred.promise;
    }
};

module.exports = TestMngr;