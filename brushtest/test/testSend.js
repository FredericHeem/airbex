/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testSend')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');
var Q = require('Q');
var num = require('num');

describe('Send', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    var clientBobConfig = testMngr.clientConfig("bob");
    var marketName = "BTCEUR";
    var currency = "BTC";
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    
    describe('SendPublic', function () {
        it('SendPublicAlice', function (done) {
            client.post('v1/spend')
            .fail(function(err){
                assert.equal(err.name, "NotAuthenticated")
                done()
            })
            .fail(done)
        });
    });
    
    describe('SendAuth', function () {
        before(function(done) {
            debug("before");
            this.timeout(10 * 1000);
            testMngr.login()
            .then(function(){
                return snowBot.setBalance(client, "10", currency, config.btc_depsosit_address)
            })
            .then(done)
            .fail(done);
        });
        it('SendInvalidCurrency', function (done) {
            var param = {
                    email:clientConfig.email,
                    currency:"ABC",
                    amount:"1"
            }
            client.postPasswordRequired('v1/send', param)
            .fail(function(err){
                assert.equal(err.name, "InvalidCurrency")
                done();
            })
            .fail(done)
        });
        it('SendCurrencyFiat', function (done) {
            var param = {
                    email:clientConfig.email,
                    currency:"EUR",
                    amount:"1"
            }
            client.postPasswordRequired('v1/send', param)
            .fail(function(err){
                console.log(err)
                assert.equal(err.name, "CannotSendFiat")
                done();
            })
            .fail(done)
        });
        it('SendInvalidAmount', function (done) {
            var param = {
                    email:clientBobConfig.email,
                    currency:currency,
                    amount:"-1"
            }
            client.postPasswordRequired('v1/send', param)
            .fail(function(err){
                assert.equal(err.name, "BadRequest")
                done();
            })
            .fail(done)
        });
        it('SendInvalidNullAmount', function (done) {
            var param = {
                    email:clientBobConfig.email,
                    currency:currency,
                    amount:"0"
            }
            client.postPasswordRequired('v1/send', param)
            .fail(function(err){
                console.log(err);
                assert.equal(err.name, "AmountTooSmall")
                done();
            })
            .fail(done)
        });
        it('SendInvalidAmountTooLow', function (done) {
            var param = {
                    email:clientBobConfig.email,
                    currency:currency,
                    amount:"0.00001"
            }
            client.postPasswordRequired('v1/send', param)
            .fail(function(err){
                console.log(err);
                assert.equal(err.name, "AmountTooSmall")
                done();
            })
            .fail(done)
        });
        it('SendInvalidAmountTooHigh', function (done) {
            var param = {
                    email:clientBobConfig.email,
                    currency:currency,
                    amount:"100"
            }
            client.postPasswordRequired('v1/send', param)
            .fail(function(err){
                console.log(err);
                assert.equal(err.name, "AmountTooHigh")
                done();
            })
            .fail(done)
        });
        it('SendToItself', function (done) {
            var param = {
                    email:clientConfig.email,
                    currency:currency,
                    amount:"1"
            }
            client.postPasswordRequired('v1/send', param)
            .fail(function(err){
                console.log(err);
                assert.equal(err.name, "SendToItself")
                done();
            })
            .fail(done)
        });
        it('SendToUnknownEmail', function (done) {
            var amount = "0.1";
            var param = {
                    email:"newuser@mail.com",
                    currency:currency,
                    amount:amount,
                    allowNewUser:true
            }
            var balanceAliceB4;
            client.balance(currency)
            .then(function (balance) {
                balanceAliceB4 = balance;
                
                console.log("B4 Alice : ", balance)
                return client.postPasswordRequired('v1/send', param)
            })
            .then(function(result){
                console.log("result: ", result)
                return client.balance(currency)
            })
            .then(function(balanceAlice){
                console.log("AF Alice : ", balanceAlice);
                assert(num(balanceAliceB4.balance).eq(num(balanceAlice.balance)))
                assert(num(balanceAliceB4.available).sub(num(amount)).eq(num(balanceAlice.available)))
                return client.get('v1/vouchers')
            })
            .then(function(vouchers){
                console.log(vouchers);
                
                done();
            })
            .fail(done)
        });
        it('SendToBob', function (done) {
            var amount = "0.1";
            var param = {
                    email:clientBobConfig.email,
                    currency:currency,
                    amount:amount
            }
            var balanceAliceB4,balanceBobB4;
            Q.all([client.balance(currency), clientBob.balance(currency)])
            .spread(function (balanceAlice, balanceBob) {
                balanceAliceB4 = balanceAlice;
                balanceBobB4 = balanceBob;
                
                console.log("B4 Alice : ", balanceAlice)
                console.log("B4 Bob: ", balanceBob)
                return client.postPasswordRequired('v1/send', param)
            })
            .then(function(result){
                console.log("result: ", result)
                Q.all([client.balance(currency), clientBob.balance(currency)])
                .spread(function (balanceAlice, balanceBob) {
                    console.log("AD Alice : ", balanceAlice)
                    console.log("AF Bob: ", balanceBob)
                    assert(num(balanceAliceB4.balance).sub(num(amount)).eq(num(balanceAlice.balance)))
                    assert(num(balanceBobB4.balance).add(num(amount)).eq(num(balanceBob.balance)))
                    
                    done();
                }).fail(done)
            })
            .fail(done)
        });
    });
   
});