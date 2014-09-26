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
        });
        it('OrderAmountBidTooLow', function (done) {
            client.order({
                market: config.market,
                type: "bid",
                price: config.bid_price,
                amount: "0.00001"
            }).fail(function(err){
                assert(err)
                assert.equal(err.name, 'BadRequest')
                assert.equal(err.message, 'Volume too low')
                done()
            })
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