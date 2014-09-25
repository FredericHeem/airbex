/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testSnow')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('Markets', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    
    before(function(done) {
        debug("before");
        this.timeout(5 * 1000);
        testMngr.login().then(done).fail(done);
    });
    
    describe('Markets', function () {
        it('MarketAuthenticated', function (done) {
            client.markets().then(function(markets) {
                console.log(client.createTableMarkets(markets).toString())
                done();
            }).fail(done)
        });
        it('MarketPublic', function (done) {
            client.markets().then(function(markets) {
                console.log(client.createTableMarkets(markets).toString())
                done();
            }).fail(done)
        });
    });
});