/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testOrders')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');
var num = require('num');
var _ = require('lodash');
var Airbex = require('airbex-client');
var Q = require('Q');

describe('Orders', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    var bc = "BTC";
    var qc = "EUR"
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    after(function(done) {
        testMngr.stop().then(done).fail(done);
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
        var apiwsBob = new Airbex.WebSocketClient({
            url:config.url,
            apiKey:clientBob.config.apiKey
        });
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login()
            .then(function(){
                return apiwsBob.start();
            })
            .then(function(){
                return apiwsBob.login(clientBob.config.email, clientBob.config.password);
            })
            .then(function(){
                clientBob.delete('v1/orders', {market:config.market})
                .then(done).fail(done)
            })
            .then(done)
            .fail(done);
        });
        it('aliceOrders', function (done) {
            client.orders().then(function(orders) {
                //console.log(client.createTableOrders(orders).toString())
                done()
            }).fail(done)
        });
        it('CancelOrderNotFound', function (done) {
            client.cancel(99999999).fail(function(err){
                //console.log("CancelOrderNotFound ", JSON.stringify(err))
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
        it('CancelAllForMarket', function (done) {
            this.timeout(5e3)
            clientBob.delete('v1/orders', {market:config.market})
            .then(done).fail(done)
        });
        it('OrderActivity', function (done) {
            this.timeout(4e3)
            apiwsBob.getIo().once('activity', function(activities){
                //console.log("ACT", activities);
                assert(activities)
                done();
            })
            var amount = "0.010";
            var askPrice = "1000";
            var bidPrice = "1010"
            var balanceAliceB4,balanceBobB4;
            Q.all([client.balances(), clientBob.balances()])
            .spread(function (balanceAlice, balanceBob) {
                balanceAliceB4 = balanceAlice;
                balanceBobB4 = balanceBob;
                
                console.log("B4 Alice : ", balanceAlice)
                console.log("B4 Bob: ", balanceBob)
                return clientBob.order({
                    market: config.market,
                    type: "ask",
                    price: askPrice,
                    amount: amount
                })
            })
            .then(function(res) {
                assert(res.id)
                return client.order({
                    market: config.market,
                    type: "bid",
                    price: bidPrice,
                    amount: amount
                })
            })
            .then(function(res) {
                assert(res.id)
               return Q.all([client.balances(), clientBob.balances()])
                .spread(function (balanceAlice, balanceBob) {
                    console.log("AF Alice : ", balanceAlice)
                    console.log("AF Bob: ", balanceBob)
                    
                    
                    //assert(num(balanceAlice[bc].balance).gt(num(balanceAliceB4[bc].balance)))
                    console.log("DIFF ALICE QC: " + num(balanceAlice[qc].balance)
                            .sub(num(balanceAliceB4[qc].balance).toString()));
                    console.log("DIFF BOB QC: " + num(balanceBob[qc].balance)
                            .sub(num(balanceBobB4[qc].balance)).toString());

                    console.log("DIFF ALICE BC: " + num(balanceAlice[bc].balance)
                            .sub(num(balanceAliceB4[bc].balance).toString()));
                    console.log("DIFF BOB BC: " + num(balanceBob[bc].balance)
                            .sub(num(balanceBobB4[bc].balance)).toString());
                    
                    
                    assert(num(balanceBobB4[bc].balance)
                    .sub(num(balanceBob[bc].balance))
                    .sub(num(amount)).eq(num(0)))
                    
                    assert(num(balanceAlice[bc].balance)
                    .sub(num(balanceAliceB4[bc].balance))
                    .sub(num(amount)).eq(num(0)))
                    
                    console.log("amount:", num(askPrice).set_precision(5).mul(amount).toString());
                    
                    assert(num(balanceBob[qc].balance)
                    .sub(num(balanceBobB4[qc].balance))
                    .sub(num(askPrice).set_precision(5).mul(amount)).gt(num(0)))
                    
                    assert(num(balanceAliceB4[qc].balance)
                    .sub(num(balanceAlice[qc].balance))
                    .sub(num(askPrice).set_precision(5).mul(amount)).gt(num(0)))
                    
                    //num(askPrice).set_precision(5).div(amount);
                    //console.log("DIFF BC ALICE" + num(balanceAlice[bc].balance).sub(num(balanceAliceB4[bc].balance)).toString());
                    //console.log("DIFF BC BOB" + num(balanceBob[bc].balance).sub(num(balanceBobB4[bc].balance)).toString());
                    
                    
                    /*assert(num(balanceAlice[bc].balance)
                    .sub(num(balanceAliceB4[bc].balance))
                     .sub(num(balanceBobB4[bc].balance))
                    .add(num(balanceBob[bc].balance)).eq(num(0)));*/
                    
                    //assert(num(balanceAliceB4.balance).sub(num(amount)).eq(num(balanceAlice.balance)))
                    //assert(num(balanceBobB4.balance).add(num(amount)).eq(num(balanceBob.balance)))
                    
                })
            })
            .then(function() {
                return clientBob.get('v1/activities')
            })
            .then(function(activities) {
                assert(activities);
                console.log("Bob: ", activities[0])
                console.log("bob: ", activities[1])
                return client.get('v1/activities')
            })
            .then(function(activities) {
                assert(activities);
                console.log("Alice: ", activities[0])
                console.log("Alice: ", activities[1])
                var fillOrder = activities[0];
                assert(fillOrder);
                assert.equal(fillOrder.type, 'FillOrder');
                //var createOrder = activities[0];
                //assert(createOrder);
                //assert.equal(createOrder.type, 'FillOrder');
            })
            .fail(done)
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
        it('AskCancelBalance', function (done) {
            this.timeout(200e3);
            function askCancelBalance(done){
                var balancesB4;
                client.balances()
                .then(function(balances){
                    //console.log("balances b4   ", JSON.stringify(balances[config.base_currency]))
                    balancesB4 = balances;
                    return client.order({
                        market: config.market,
                        type: "ask",
                        price: config.bid_price,
                        amount: balances[config.base_currency].available
                    });
                })
                .then(function(res) {
                    assert(res)
                    assert(res.id)
                    return client.cancel(res.id)
                })
                .then(function(){
                    //console.log("balances b4   ", JSON.stringify(balances[config.base_currency]))
                    return client.order({
                        market: config.market,
                        type: "ask",
                        price: config.bid_price,
                        amount: balances[config.base_currency].available
                    });
                })
                .then(function(res) {
                    assert(res)
                    assert(res.id)
                    return client.cancel(res.id)
                })
                .then(function(){
                    return client.balances();
                })
                .then(function(balances){
                    //console.log("balances after ", JSON.stringify(balances[config.base_currency]))
                    assert(_.isEqual(balances, balancesB4))
                })
                .then(done)
                .fail(done)
            }
            var step = 0;
            var maxStep = 5;
            function askCancelBalanceCall(){
                askCancelBalance(function(){
                    step++;
                    if(step > maxStep){
                        done()
                    } else {
                        askCancelBalanceCall(); 
                    }
                })
            }
            askCancelBalanceCall();
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
