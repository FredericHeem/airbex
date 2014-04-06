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

    before(function(done) {
        debug("before");
        async.waterfall(
                [
                 function(callback) {
                     snowChef.securitySession(clients, callback)
                 },
                 function(callback) {
                     snowBot.db.pgClient.connect(callback);
                 }
                 ],

                 function(err) {
                    debug("init done")
                    done(err);
                }
        );
    });
    
    describe('SnowChefFunding', function () {
        this.timeout(120*1000);
        it('SnowChefBtcAddress', function (done) {
            snowChef.setDepositAddress(clients, done);
        });
        it('SnowChefBtcCredit', function (done) {
            snowChef.creditBTC(clients, done);
        });
    });    
    
    describe('SnowChefApi', function () {
        this.timeout(120*1000);
        it('MarketAll', function (done) {
            snowChef.markets(clients, done);
        });
        it('WhoamiAll', function (done) {
            snowChef.whoami(clients, done);
        });
        it('BalancesAll', function (done) {
            snowChef.balances(clients, done);
        });   
        it('OrdersAll', function (done) {
            snowChef.orders(clients, done);
        });   
        it('CancelAllOrders', function (done) {
            snowChef.cancellAllOrders(clients, done)
        });        
    });
    
    describe('SnowChefTrade', function () {
        this.timeout(60*1000);
        it('SnowChefBuyUntilNoFund', function(done) {
            var order = {
                market: config.market,
                type: "bid",
                price: config.bid_price,
                amount: config.volume
            };
            debug("SnowChefBuyUntilNoFund %s", JSON.stringify(order));
            snowChef.tradeUntillNoFunds(clients, order, done);
        });
        it('SnowChefSellUntilNoFund', function(done) {
            var order = {
                market: config.market,
                type: "ask",
                price: config.ask_price,
                amount: config.volume
            };
            debug("SnowChefBuyUntilNoFund %s", JSON.stringify(order));
            snowChef.tradeUntillNoFunds(clients, order, done);
        });        
    });    
});