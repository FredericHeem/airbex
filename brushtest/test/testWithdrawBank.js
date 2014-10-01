/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testWithdrawBank')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('WithdrawBank', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    
    describe('WithdrawBankPublic', function () {
        it('WithdrawBankPublicAlice', function (done) {
            client.get("v1/withdraws")
            .fail(function(err){
                assert.equal(err.name, "NotAuthenticated")
                done()
            });
        });
    });
    
    describe('WithdrawBankAuth', function () {
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
        it('WithdrawBankAuthList', function (done) {
            client.get("v1/withdraws")
            .then(function(withdraws) {
                assert(withdraws)
                console.log(withdraws)
                done()
            }).fail(done);
        });
        it('WithdrawBankBTC', function (done) {
            var param = {};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                assert.equal(err.name, "BadRequest")
                done()
            });
        });
    });
   
});