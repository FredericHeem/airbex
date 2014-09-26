/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testBalances')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('Balances', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    
    describe('BalancesPublic', function () {
        it('BalancesPublicAlice', function (done) {
            client.balances()
            .fail(function(err){
                assert.equal(err.name, "NotAuthenticated")
                done()
            });
        });
    });
    
    describe('BalancesAuth', function () {
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
        it('BalancesAuthAlice', function (done) {
            client.balances().then(function(balances) {
                console.log(client.createTableBalances(balances).toString())
                done()
            }).fail(done);
        });
    });
   
});