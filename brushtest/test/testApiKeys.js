/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testApiKeys')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('apiKeys', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    
    describe('ApiKeyPublic', function () {
        it('ApiKeyPublicAlice', function (done) {
            client.get('v1/keys')
            .fail(function(err){
                console.log("AAAError ", err)
                assert(err)
                //assert.equal(err.name, "NotAuthenticated")
                done()
            });
        });
    });
    
    describe('ApiKeyAuth', function () {
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
        it('ApiKeyAuthAlice', function (done) {
            client.get('v1/keys').then(function(apiKeys) {
                assert(apiKeys)
                done()
            }).fail(done);
        });
    });
   
});