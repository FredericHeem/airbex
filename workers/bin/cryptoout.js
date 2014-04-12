var config = require('konfu')
, async = require('async')
, debug = require('debug')('snow:cryptoout')
, Bitcoin = require('bitcoin').Client
, CryptoOut = require('../lib/cryptoout')
, cryptoEndPoint = {
    currency : config.currency,
    host: config.host,
    port: config.port,
    user: config.rpcuser,
    pass: config.rpcpass,
    ssl: config.ssl || false
}

var pg = require('pg')
var Client = pg.Client
var dbClient = new Client(config.pg_url)

var daemon = new Bitcoin(cryptoEndPoint);

debug("Outgoing transaction for currency ", config.currency);

async.series(
        [
         function(callback) {
             dbClient.connect(function(err) {
                 if(err) {
                     debug("db connection error: ", err)
                 } else {
                     debug("db connected");
                 }
                 callback(err);
             });
         },
         function(callback) {
             daemon.getInfo(function(err){
                 debug("daemon.getInfo")
                 if(err){
                     debug("daemon.getinfo error: ", err)
                 }
                 callback()
             })
         }
         ],
         function(err) { 
            if (err)  {
                
            } else {
                new CryptoOut(cryptoEndPoint, dbClient)
            }
        });

