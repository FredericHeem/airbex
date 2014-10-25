/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testDepth')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('Depth', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    
    describe('DepthPublic', function () {
        it('DepthPublicAlice', function (done) {
            client.depth("BTCEUR").then(function(depth) {
                assert(depth)
                done()
            }).fail(done);
        });
    });
    
    describe('DepthAuth', function () {
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
        it('DepthAuthAlice', function (done) {
            client.depth("BTCEUR").then(function(depth) {
                assert(depth)
                //console.log(depth)
                assert(depth.bids)
                assert(depth.asks)
                done()
            }).fail(done);
        });
    });
   
});