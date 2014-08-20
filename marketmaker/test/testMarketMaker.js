/*global describe, it, before, after*/
var _ = require("underscore")
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var config = require('./configTest.js')();
var MarketMaker = require('../MarketMaker.js');
var debug = require('debug')('testMarketMaker');
var bigdecimal = require("bigdecimal");

describe('MarketMaker', function () {
    "use strict";
    var timeout = 1000 * 60;
    
    var marketMaker = new MarketMaker(config);
    
    before(function(done) {
        //debug("before")
        done()
    });
    describe('Balance', function() {
        it('GetBalanceTarget', function(done) {
            marketMaker.getBalanceTarget(function(err, balances) {
                if (err) throw err;
                done();
            })
        });

        it('MonitorBalance', function(done) {
            var balanceTargetInitial = [
            {
                "currency": "BTC",
                "balance": "1111.34234000",
                "hold": "0.00000000",
                "available": "1111.34234000"
            }, {
                "currency": "EUR",
                "balance": "1110541.89400",
                "hold": "0.00000",
                "available": "1110541.89400"
            }]
          
            marketMaker.monitorBalance(balanceTargetInitial, function(err, balanceTarget) {
                if (err) throw err;
                done();
            })
        });
    });  
    describe('CancelAllOrders', function() {
        this.timeout(timeout);
        it('CancelAllOrders', function(done) {
           marketMaker.cancelAllOrders(function(err){
            if(err) throw err;
            done();
           })
        });
    });   
    describe('GetMarketDepth', function() {
        this.timeout(timeout);
        
        it('GetOrderBook', function(done) {
           marketMaker.getOrderBook(10, 10000, function(err, bids, asks){
            if(err) throw err;
            done();
           })
        });
    });
    
    describe('GetMarketDepthAndSendOrders', function() {
        this.timeout(5 * 60 * 1000);

        it('GetMarketDepthAndSendOrdersSimple', function(done) {
            marketMaker.getOrderBookAndSendOrders(1, 10000, function(err) {
                if (err) throw err;
                done();
            })
        });
        it('MirrorOrderBook', function(done) {
            marketMaker.mirrorOrderBook(function(err) {
                if (err) throw err;
                marketMaker.getClient().depth(config.market, function(err, depth) {
                    if (err) throw err
                    console.log(depth)
                    done()
                })
            })
        });       
        it('LoopGetMarketDepthAndSendOrders', function(done) {
            marketMaker.loopGetOrderBookAndSendOrders(function(err) {
                if (err) throw err;
                done();
            })
        });
        
    });    
    describe('SendOrder', function() {
        this.timeout(timeout);
        
        it('CancelAndSendOrders', function(done) {
            var bids = [
                ["900.00", "1"],
                ["860.00", "1"],
                ["600.00", "2"],
                ["500.00", "2"],
                ["450.00", "2"]
            ];
            var asks = [
                ["1000.00", "1"],
                ["1100.00", "1"],
                ["1200.00", "1.5"],
                ["1250.00", "2"],
                ["1300.00", "2"]
            ];
            debug("From: %s", JSON.stringify(asks));
            marketMaker.cancelAndSendOrders(bids, asks, function(err) {
                if (err) throw err
                done();
            })
        });
    });
    
    describe('FilterBids', function () {
        this.timeout(timeout);
        it('FilterBidsComplex1', function (done) {
           var bids = [["990.00", "3"], ["980.00", "2"]];
           debug("From: %s", JSON.stringify(bids));
           var balance = 3000; // in quote curreny: USD
           var bidsFilter = marketMaker.filterBids(bids, balance);
           debug("To  : %s", JSON.stringify(bidsFilter));
           assert.equal(bidsFilter.length, 2);
           var qty = (3000 - (3 * 990)) / 980;
           assert.equal(bidsFilter[1][1], qty.toFixed(8))
           done();
        });
        it('FilterBidsSimple', function (done) {
           debug("FilterBids")
           
           var bids = [["990.00", "3"], ["980.00", "2"]];
           var balance = 500; // in quote curreny: USD
           var bidsFilter = marketMaker.filterBids(bids, balance);
           assert.equal(bidsFilter.length, 1);
           assert.equal(bidsFilter[0][0], 990);
           var qty = Math.floor( 500/990 * 1e8) / 1e8
           assert.equal(bidsFilter[0][1], qty)
           done();
        }); 
        it('FilterBidsEmptyBalance', function (done) {
           var bids = [["990.00", "3"], ["980.00", "2"]];
           var balance = 0; // in quote curreny: USD
           var bidsFilter = marketMaker.filterBids(bids, balance);
           assert.equal(bidsFilter.length, 0);
           done();
        });  
        it('FilterBidsLowBalance', function (done) {
           var bids = [["990.00", "3"], ["980.00", "2"]];
           var balance = 4; // in quote curreny: USD
           var bidsFilter = marketMaker.filterBids(bids, balance);
           assert.equal(bidsFilter.length, 0);
           done();
        });          
        it('FilterBidsBalanceMaxi', function (done) {
           var bids = [["990.00", "3"], ["980.00", "2"]];
           debug("From: %s", JSON.stringify(bids));
           var balance = 30000; // in quote curreny: USD
           var bidsFilter = marketMaker.filterBids(bids, balance);
           debug("To  : %s", JSON.stringify(bidsFilter));
           assert(bidsFilter);
           assert.deepEqual(bidsFilter, bids);
           done();
        });        
        
    });
    describe('FilterAsks', function () {
        this.timeout(timeout);
        it('FilterFee', function (done) {
           var asks = [["1000.00", "3"], ["1100.00", "2"]];
           debug("From: %s", JSON.stringify(asks));
           
           var asksFilter = marketMaker.addFee(asks, 1.05);
           assert.deepEqual([["1050.00000", "3"], ["1155.00000", "2"]], asksFilter);
           done();
        });
        it('FilterAskComplex1', function (done) {
           var asks = [["1000.00", "3"], ["1100.00", "2"]];
           debug("From: %s", JSON.stringify(asks));
           var balance = 4; // in base curreny: BTC
           var asksFilter = marketMaker.filterAsks(asks, balance);
           assert.deepEqual([["1000.00", "3"], ["1100.00", "1"]], asksFilter);
           done();
        });
    
        it('FilterAsksSimple', function (done) {
           var asks = [["1000.00", "3"], ["1100.00", "2"]];
           var balance = 1.2; // in quote curreny: BTC
           var asksFilter = marketMaker.filterAsks(asks, balance);
           assert.deepEqual([["1000.00", "1.2"]], asksFilter);
           done();
        }); 
        it('FilterAsksEmptyBalance', function (done) {
           var asks = [["990.00", "3"], ["980.00", "2"]];
           var balance = 0; // in BTC
           var asksFilter = marketMaker.filterAsks(asks, balance);
           assert.equal(asksFilter.length, 0);
           done();
        });  
        it('FilterAsksLowBalance', function (done) {
           var asks = [["990.00", "3"], ["980.00", "2"]];
           var balance = 0.004; // in BTC
           var asksFilter = marketMaker.filterAsks(asks, balance);
           assert.equal(asksFilter.length, 0);
           done();
        });          
        it('FilterAsksBalanceMaxi', function (done) {
           var asks = [["990.00", "3"], ["980.00", "2"]];
           var balance = 6; // in BTC
           var asksFilter = marketMaker.filterAsks(asks, balance);
           assert.deepEqual(asksFilter, asks);
           done();
        });        
    });
});
