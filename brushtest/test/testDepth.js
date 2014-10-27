/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testDepth')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');
var Airbex = require('airbex-client');

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
            })
            .fail(done);
        });
    });
    
    describe('DepthAuth', function () {
        var apiws = new Airbex.WebSocketClient({
            url:config.url,
            apiKey:client.config.apiKey
        });
        
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login()
            .then(apiws.start())
            .then(apiws.login(client.config.email, client.config.password))
            .then(done)
            .fail(done);
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
        it('DepthWebSocketOk', function (done) {
            this.timeout(10e3)
            apiws.getIo().once('/v1/markets/' + config.market + '/depth', function(depth){
                console.log("depth", depth);
                assert(depth)
                done();
            })
            
            client.order({
                market: config.market,
                type: "bid",
                price: "100",
                amount: "0.001"
            })
            .then(function(result){
                console.log(result);
            })
            .fail(function(err){
                assert(err);
            })
            
        });
    });
   
});