/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var config = require('./configTest.js')();
var debug = require('debug')('snowtest')
var TestMngr = require('./TestMngr');

describe('SnowChef', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clients = testMngr.clients();
    
    before(function(done) {
        debug("before");
        testMngr.dbConnect()
        .then(testMngr.login)
        .then(done)
        .fail(done);
    });
    
    describe('SnowChefFunding', function () {
        this.timeout(120*1000);
        it('SnowChefBtcAddress', function (done) {
            snowChef.setDepositAddress(clients, done);
        });
        it('SnowChefCryptoCreditBTC', function (done) {
            snowChef.creditCrypto(clients, 'BTC', done);
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