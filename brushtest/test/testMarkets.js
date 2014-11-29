/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testMarkets')
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
        testMngr.start().then(done).fail(done);
    });
    after(function(done) {
        testMngr.stop().then(done).fail(done);
    });
    
    describe('MarketPublic', function () {
        it('MarketPublic', function (done) {
            client.markets().then(function(markets) {
                //console.log(client.createTableMarkets(markets).toString())
                done();
            }).fail(done)
        });
        it('VohlcDayBTCUSD', function (done) {
            client.get('v1/markets/BTCUSD/vohlc?range=1d').then(function(vohlc) {
                //console.log(vohlc)
                assert(vohlc);
                assert(vohlc.length);
                done();
            })
            .fail(done)
        });
        it('VohlcWeek', function (done) {
            client.get('v1/markets/BTCUSD/vohlc?range=1w').then(function(vohlc) {
                console.log("#vohlc", vohlc.length)
                assert(vohlc);
                assert(vohlc.length);
                done();
            })
            .fail(done)
        });
        it('VohlcMonth', function (done) {
            client.get('v1/markets/BTCUSD/vohlc?range=1m').then(function(vohlc) {
                assert(vohlc);
                assert(vohlc.length);
                console.log("#vohlc", vohlc.length)
                console.log(vohlc[0])
                console.log(vohlc[vohlc.length - 1])
                done();
            })
            .fail(done)
        });
    });
    
    describe('Markets', function () {
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
        it('MarketAuthenticated', function (done) {
            client.markets().then(function(markets) {
                //console.log(client.createTableMarkets(markets).toString())
                done();
            }).fail(done)
        });
        it('MarketInfo', function (done) {
            client.get('v1/markets/info').then(function(marketsInfo) {
                //console.log(marketsInfo)
                assert(marketsInfo);
                assert(marketsInfo[0].bidminvolume)
                done();
            })
            .fail(done)
        });
    });
});