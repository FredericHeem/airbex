/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var config = require('./configTest.js')();
var num = require('num');
var debug = require('debug')('snowtest')
var SnowBot = require('./snow-bot');
var SnowChef = require('./snow-chef');

describe('SnowClient', function () {
    "use strict";
    
    var alice_config = config.users[1];
    var bob_config = config.users[2];
    alice_config.url = config.url; 
    bob_config.url = config.url; 
    var client = new (require('../../client/index'))(alice_config);
    var client_bob = new (require('../../client/index'))(bob_config);
    var clients = [];
    clients.push(client);
    clients.push(client_bob);
    
    var snowBot = new SnowBot(config);
    var snowChef = new SnowChef(snowBot, config);
    
    var displayDepth = function(depth){
        if(!depth){
            console.error("Invalid depth")
            return
        }
        console.log(depth)
    }
    
    before(function(done) {
        debug("before");
        this.timeout(5 * 1000);
        snowChef.securitySession(clients, done)
    });
    
    describe('Markets', function () {
        it('MarketOne', function (done) {
            client.markets(function(err, markets) {
                if (err) throw err
                console.log(client.createTableMarkets(markets).toString())
                done();
            })
        });
    });
    describe('UploadDoc', function () {
        it('UploadDocOk', function (done) {
            var file = '/Users/frederic/Downloads/a_style_logo_Mod3.jpg';
            snowBot.uploadDocument(client, file, function(err, res){
                assert(!err)
                done();
            })
        });
//        it('UploadDocTooBig', function (done) {
//            this.timeout(60*1000);
//            var file = '/Users/frederic/Downloads/bfg-1.11.0.jar';
//            snowBot.uploadDocument(client, file, function(err, res){
//                assert(res.statusCode == 400)
//                done();
//            })
//        });        
    });    
    describe('Whoami', function () {
        it('WhoamiAlice', function (done) {
            client.whoami(function(err, user) {
                if (err) throw err
                console.log(client.createTableUser(user).toString())
                done()
            });
        });
    });
    
    describe('Depth', function() {
        it('Depth', function(done) {
            client.depth(config.market, function(err, depth) {
                if (err) throw err
                displayDepth(depth)
                done()
            })
        });
    });

    describe('Balances', function () {
        it('BalancesAlice', function (done) {
            client.balances(function(err, balances) {
                if (err) throw err
                console.log(client.createTableBalances(balances).toString())
                done()
            });
        });
    });

    describe('Orders', function () {

        it('aliceOrders', function (done) {
            client.orders( function(err, orders) {
                if (err) throw err
                console.log(client.createTableOrders(orders).toString())
                done()
            })
        });
        
        it('aliceBid', function (done) {
            client.order({
                market: config.market,
                type: "bid",
                price: config.bid_price,
                amount: config.volume
            }, function(err, id) {
                assert(!err || err && err.name == "InsufficientFunds")
                debug('Order bid #%s placed', id)
                done()
            })
        });
        it('bobAsk', function (done) {
            clients[1].order({
                market: config.market,
                type: "ask",
                price: config.ask_price,
                amount: config.volume
            }, function(err, id) {
                assert(!err || err && err.name == "InsufficientFunds")
                debug('Order ask #%s placed', id)
                done()
            })
        });
    });
    
    describe('Trade', function () {
        this.timeout(60*1000);
        it('BuyUntilNoFund', function(done) {
            var order = {
                market: config.market,
                type: "bid",
                price: config.bid_price,
                amount: config.volume
            };
            debug("BuyUntilNoFund %s", JSON.stringify(order));
            snowBot.tradeUntillNoFunds(client, order, done);
        });
        it('SellUntilNoFund', function(done) {
            var order = {
                market: config.market,
                type: "ask",
                price: config.ask_price,
                amount: config.volume
            };
            debug("BuyUntilNoFund %s", JSON.stringify(order));
            snowBot.tradeUntillNoFunds(client, order, done);
        });        
    });
   
});