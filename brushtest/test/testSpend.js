/*global describe, it, before, after*/
var assert = require('assert');
var Q = require('Q');
var request = require('supertest');
var debug = require('debug')('testSpend')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');
var num = require('num');

describe('Spend', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    var marketName = "BTCEUR";
    var bc = "BTC";
    var qc = "EUR"
    var amount = "2";
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    
    describe('SpendPublic', function () {
        it('SpendPublicAlice', function (done) {
            client.post('v1/spend')
            .fail(function(err){
                assert.equal(err.name, "NotAuthenticated")
                done()
            });
        });
    });
    
    describe('SpendAuth', function () {
        before(function(done) {
            var withdrawAddress = config.btc_depsosit_address
            this.timeout(5 * 1000);
            testMngr.login()
            .then(function(){
                return snowBot.setBalance(clientBob, amount, bc, withdrawAddress)
            })
            .then(function(){
                return client.delete('v1/orders/', {market:marketName})
            })
            .then(function(){
                return clientBob.delete('v1/orders/', {market:marketName})
            })
            .then(function(){
                return clientBob.order({
                    market: marketName,
                    type: "ask",
                    price: "400",
                    amount: "1"
                })
            })
            .then(function(result){
                assert(result.id);
                done();
            })
            .fail(done);
        });
        it('SpendInvalidMarket', function (done) {
            var param = {
                    amount:"1",
                    market:"ABCDEF"
            }
            client.post('v1/spend', param)
            .fail(function(err){
                assert.equal(err.name, "MarketNotFound")
                done();
            });
        });
        it('SpendInvalidAmount', function (done) {
            var param = {
                    amount:"-1",
                    market:marketName
            }
            client.post('v1/spend', param)
            .fail(function(err){
                console.log(err);
                assert.equal(err.name, "BadRequest")
                done();
            })
            .fail(done);
        });
        it('SpendAmountTooLow', function (done) {
            var param = {
                    amount:"0.01",
                    market:marketName
            }
            client.post('v1/spend', param)
            .fail(function(err){
                console.log(err);
                assert.equal(err.name, "VolumeTooLow")
                done();
            })
            .fail(done);
        });
        it('SpendAmountTooHigh', function (done) {
            var param = {
                    amount:"100000000",
                    market:marketName
            }
            client.post('v1/spend', param)
            .fail(function(err){
                console.log(err);
                assert.equal(err.name, "AmountTooHigh")
                done();
            })
            .fail(done);
        });
        it('SpendAuthAlice', function (done) {
            var param = {
                    amount:"50",
                    market:marketName
            }
            var balanceAliceB4,balanceBobB4;
            Q.all([client.balances(), clientBob.balances()])
            .spread(function (balanceAlice, balanceBob) {
                balanceAliceB4 = balanceAlice;
                balanceBobB4 = balanceBob;
                
                console.log("B4 Alice : ", balanceAlice)
                console.log("B4 Bob: ", balanceBob)
                return client.post('v1/spend', param) 
            })
            .then(function(oid) {
                return Q.all([client.balances(), clientBob.balances()])
                .spread(function (balanceAlice, balanceBob) {
                    console.log("AF Alice : ", balanceAlice)
                    console.log("AF Bob: ", balanceBob)
                    assert(num(balanceAlice[bc].balance).gt(num(balanceAliceB4[bc].balance)))
                    //assert(num(balanceAliceB4.balance).sub(num(amount)).eq(num(balanceAlice.balance)))
                    //assert(num(balanceBobB4.balance).add(num(amount)).eq(num(balanceBob.balance)))
                    
                })
            })
            .then(done)
            .fail(done);
        });
    });
   
});