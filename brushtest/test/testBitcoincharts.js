/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testCharts')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('Charts', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    var currency = 'btc';
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    
    describe('ChartsPublic', function () {
        it('ChartsPublicTrade', function (done) {
            client.get('bitcoincharts/' + currency + '/trades.json')
            .then(function(result){
                assert(result)
                //console.log(result)
                done()
            });
        });
        it('ChartsPublicOrderbook', function (done) {
            client.get('bitcoincharts/' + currency + '/orderbook.json')
            .then(function(result){
                assert(result)
                //console.log(result)
                done()
            });
        });
    });
    
    describe('ChartsAuth', function () {
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });

    });
   
});