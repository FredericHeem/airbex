/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testSnow')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('SnowClient', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    
    var displayDepth = function(depth){
        if(!depth){
            console.error("Invalid depth")
            return
        }
        console.log(depth)
    }
    
    before(function(done) {
        debug("before");
        this.timeout(5 * 1000);
        testMngr.login().then(done).fail(done);
    });
    
    describe('Depth', function() {
        it('Depth', function(done) {
            client.depth(config.market, function(err, depth) {
                if (err) throw err
                displayDepth(depth)
                done()
            })
        });
    });
});