/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var config = require('./configTest.js')();
var debug = require('debug')('testDeposit')
var TestMngr = require('./TestMngr');

describe('TestDeposit', function () {
    "use strict";
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    
    describe('TestDepositBTCNotAuthenticated', function () {
        it('TestDepositBTCAddressNotAuthenticated', function (done) {
            var currency = 'BTC';
            client.getDepositAddress(currency)
           .fail(function(err){
               assert(err);
               assert.equal(err.name,'NotAuthenticated');
               done();
           })
        });
    });
    describe('TestDepositBTCAuthenticated', function () {
        before(function(done) {
            testMngr.login()
            .then(done)
            .fail(done);
        });
        it('TestDepositBTCAddress', function (done) {
            var currency = 'BTC';
            var balanceBefore;
            client.getDepositAddress(currency)
            .then(function(result){
                assert(result);
                assert(result.address)
                done();
            })
            .fail(done)
        });
        it('TestDepositBTCOk', function (done) {
            var currency = 'BTC';
            var amount = "100000000";

            var balanceBefore;
            client.balance(currency)
            .then(function(balance){
                console.log("balances: ", balance)
                balanceBefore = balance
                return snowChef.bot.db.creditCrypto(client, currency, amount)
            })
            .then(function(){
                console.log("creditCrypto: ")
                return client.balance(currency)
            })
            .then(function(balance){
                console.log("balance after: ", balance)
                balanceBefore = balance;
                done();
            })
            .fail(done)
        });
    });
});