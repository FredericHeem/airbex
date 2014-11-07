/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testDeposit');
var async = require('async');
var config = require('./configTest.js')();
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
    after(function(done) {
        testMngr.stop().then(done).fail(done);
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
            clientAdmin.getDepositAddress(currency)
            .then(function(result){
                assert(result);
                assert(result.address)
                done();
            })
            .fail(done)
        });
        
        it('TestDepositAddresses', function (done) {
            async.forEach(config.currencies, function(currency, callback) {
                clientAdmin.getDepositAddress(currency)
                .then(function(result){
                    assert(result);
                    assert(result.address)
                    callback();
                })
                .fail(callback)
            }, function(err) {
                //debug("TestDepositAddresses done: " + err ? err : "");
                done(err);
            });
        });
        
        it('TestDepositAllOk', function (done) {
            var amount = "1";
            async.forEach(config.currencies, function(currency, callback) {
                snowBot.depositComplete(client, amount, currency)
                .then(callback)
                .fail(callback);
            }, function(err) {
                //debug("TestDepositOk done: " + err ? err : "");
                done(err);
            });
        });
    });
});