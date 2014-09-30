/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testApiKeys')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('ApiKeys', function () {
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
                assert(err)
                assert.equal(err.name, "NotAuthenticated")
                done()
            });
        });
    });
    
    describe('ApiKeyAuth', function () {
        before(function(done) {
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
        it('ApiKeyAuthRead', function (done) {
            client.get('v1/keys').then(function(apiKeys) {
                assert(apiKeys)
                done()
            }).fail(done);
        });
        it('ApiKeyAuthCreatePasswordRequired', function (done) {
            client.post('v1/keys')
            .fail(function(err){
                assert(err);
                assert.equal(err.name, "PasswordRequired");
                assert(err.token);
                done();
            });
        });
        it('ApiKeyAuthCreateOk', function (done) {
            client.postPasswordRequired('v1/keys')
            .then(function(result){
                assert(result)
            })
            .then(done)
            .fail(done);
        });
    });
   
});