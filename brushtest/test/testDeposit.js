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
            testMngr.dbConnect()
            .then(testMngr.login)
            .then(done)
            .fail(done);
        });
        it('TestDepositBTCAddress', function (done) {
            var currency = 'BTC';
            client.getDepositAddress(currency)
           .then(function(result){
               assert(result);
               assert(result.address)
               console.log("result: ", result)
               done();
           })
           .fail(done)
        });
        it('TestDepositBTCOk', function (done) {
            var currency = 'BTC';
            var address = 'mvRZcE4GkHsDPtW8fSGLi8VaXe9D5iKpaR';
            var amount = "100000000";
            snowChef.bot.db.creditCrypto(client, currency, address, amount)
           .then(done)
           .fail(done)
        });
    });
});