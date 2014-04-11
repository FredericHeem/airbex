var config = require('konfu')
, async = require('async')
, debug = require('debug')('snow:cryptoin')
, Bitcoin = require('bitcoin').Client
, CryptoIn = require('../lib/cryptoin')
, cryptoEndPoint = {
    currency : config.currency,
    host: config.host,
    port: config.port,
    user: config.user,
    pass: config.pass,
    ssl: config.ssl || false
}

var pg = require('pg')
var Client = pg.Client
var dbClient = new Client(config.pg_url)

var daemon = new Bitcoin(cryptoEndPoint);

debug("Listen incoming transaction for currency ", config.currency);

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
                new CryptoIn(cryptoEndPoint, dbClient, config.minconf)
            }
        });

