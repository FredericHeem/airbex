/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testSnow')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('SnowClient', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    
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
        testMngr.login().then(done).fail(done);
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
            clientBob.order({
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