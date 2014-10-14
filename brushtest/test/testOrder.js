/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testOrders')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('Orders', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
   
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    
    describe('OrderNotAuthenticated', function () {
        it('OrdersNotAuthenticated', function (done) {
            client.orders().fail(function(error){
                assert(error)
                assert.equal(error.name, 'NotAuthenticated');
                done();  
            })
            .fail(done)
        });
        it('CancelOrderNotAuthenticated', function (done) {
            client.cancel(0).fail(function(error){
                assert(error);
                assert.equal(error.name, 'NotAuthenticated');
                done(); 
            })
            .fail(done)
        });
        it('aliceBidNotAuthenticated', function (done) {
            client.order({
                market: config.market,
                type: "bid",
                price: config.bid_price,
                amount: config.volume
            }).then(done)
            .fail(function(err){
                assert(err);
                done()
            })
            .fail(done)
        });
    });
    
    describe('OrdersAuthenticated', function () {
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
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
            .fail(done)
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
            .fail(done)
        });
        it('CancelAllForMarket', function (done) {
            client.delete('v1/orders', {market:config.market})
            .then(done).fail(done)
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
            .fail(done)
        });
        it('OrderWrongMarket', function (done) {
            client.order({
                market: "AAABBB",
                type: "bid",
                price: config.bid_price,
                amount: config.volume
            }).fail(function(err){
                assert(err)
                assert.equal(err.name, 'BadRequest')
                assert.equal(err.message, 'Market is invalid')
                done()
            })
            .fail(done)
        });
        it('OrderPriceIsInvalid', function (done) {
            client.order({
                market: config.market,
                type: "bid",
                price: "12 45",
                amount: config.volume
            }).fail(function(err){
                assert(err)
                assert.equal(err.name, 'BadRequest')
                assert.equal(err.message, 'Price is invalid')
                done()
            })
            .fail(done)
        });
        it('OrderPriceIsNegative', function (done) {
            client.order({
                market: config.market,
                type: "bid",
                price: "-1",
                amount: config.volume
            }).fail(function(err){
                assert(err)
                assert.equal(err.name, 'BadRequest')
                assert.equal(err.message, 'Price is invalid')
                done()
            })
            .fail(done)
        });
        it('OrderAmountBidNegative', function (done) {
            client.order({
                market: config.market,
                type: "bid",
                price: config.bid_price,
                amount: "-1"
            }).fail(function(err){
                assert(err)
                assert.equal(err.name, 'BadRequest')
                assert.equal(err.message, 'Request is invalid')
                done()
            })
            .fail(done)
        });
        it('OrderAmountBid0', function (done) {
            client.order({
                market: config.market,
                type: "bid",
                price: config.bid_price,
                amount: "0"
            }).fail(function(err){
                assert(err)
                assert.equal(err.name, 'BadRequest')
                assert.equal(err.message, 'Volume too low')
                done()
            })
            .fail(done)
        });
        it('OrderAmountBidTooLow', function (done) {
            client.order({
                market: config.market,
                type: "bid",
                price: config.bid_price,
                amount: "0.00001"
            }).then(function(result){
                assert(false)
            })
            .fail(function(err){
                assert(err)
                assert.equal(err.name, 'BadRequest')
                assert.equal(err.message, 'Volume too low')
                done()
            })
            .fail(done)
        });
        it('OrderPriceBidTooLow', function (done) {
            client.order({
                market: config.market,
                type: "bid",
                price: "0.001",
                amount: "1"
            }).fail(function(err){
                assert(err)
                assert.equal(err.name, 'BadRequest')
                assert.equal(err.message, 'Price too low')
                done()
            })
            .fail(done)
        });
        it('OrderAmountBidTooHigh', function (done) {
            client.order({
                market: config.market,
                type: "bid",
                price: config.bid_price,
                amount: "100000000"
            }).fail(function(err){
                assert(err)
                //assert.equal(err.name, 'BadRequest')
                //assert.equal(err.message, 'Volume too high')
                done()
            })
            .fail(done)
        });
        it('OrderAmountAsk0', function (done) {
            client.order({
                market: config.market,
                type: "ask",
                price: config.bid_price,
                amount: "0"
            }).fail(function(err){
                assert(err)
                assert.equal(err.name, 'BadRequest')
                assert.equal(err.message, 'Volume too low')
                done()
            })
            .fail(done)
        });
        it('OrderAmountAskTooLow', function (done) {
            client.order({
                market: config.market,
                type: "ask",
                price: config.ask_price,
                amount: "0.000001"
            }).fail(function(err){
                assert(err)
                assert.equal(err.name, 'BadRequest')
                assert.equal(err.message, 'Volume too low')
                done()
            })
            .fail(done)
        });
        it('OrderPriceAskTooHigh', function (done) {
            client.order({
                market: config.market,
                type: "ask",
                price: "100000",
                amount: "1"
            }).fail(function(err){
                assert(err)
                //assert.equal(err.name, 'BadRequest')
                //assert.equal(err.message, 'Price too high')
                done()
            })
            .fail(done)
        });
    });
    
    describe('Trade', function () {
        this.timeout(10e3);
        before(function(done) {
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
        after(function(done) {
            this.timeout(5 * 1000);
            var clients = testMngr.clients();
            snowChef.cancellAllOrders(clients, done)
        });
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