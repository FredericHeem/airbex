/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testOrders')
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
            client.orders().then(function(orders) {
                console.log(client.createTableOrders(orders).toString())
                done()
            }).fail(done)
        });
        it('CancelOrderNotFound', function (done) {
            client.cancel(99999999).fail(function(err){
                console.log("CancelOrderNotFound ", JSON.stringify(err))
                assert(err)
                assert.equal(err.name, 'OrderNotFound')
                done();
            })
        });
        it('CancelAll', function (done) {
            this.timeout(10e3);
            client.cancelAll().then(done).fail(done)
        });
        it('aliceBid', function (done) {
            client.order({
                market: config.market,
                type: "bid",
                price: config.bid_price,
                amount: config.volume
            }).then(function(res) {
                assert(res)
                assert(res.id)
                debug('Order bid #%s placed', res.id)
                done()
            }).fail(function(err){
                assert(!err || err && err.name == "InsufficientFunds")
                if( err && err.name == "InsufficientFunds") {
                    done()
                } else {
                    done(err)
                }
            })
        });
        it('bobAsk', function (done) {
            clientBob.order({
                market: config.market,
                type: "ask",
                price: config.bid_price,
                amount: config.volume
            }).then(function(res) {
                assert(res)
                assert(res.id)
                debug('Order bid #%s placed', res.id)
                done()
            }).fail(function(err){
                assert(!err || err && err.name == "InsufficientFunds")
                if( err && err.name == "InsufficientFunds") {
                    done()
                } else {
                    done(err)
                }
            })
        });
    });
    
    describe('Trade', function () {
        this.timeout(10e3);
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