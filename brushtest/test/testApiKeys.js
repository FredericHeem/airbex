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
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    
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
                //assert(apiKeys.length > 0)
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
                assert(result.id)
            })
            .then(done)
            .fail(done);
        });
        it('ApiKeyAuthDeleteKo', function (done) {
            client.delete('v1/keys/' + "699e1c1c1797bb169d760d76fc47ab3baa5f04646b0bc95bd27fb178f96080ae")
            .fail(function(error){
                assert(error)
                assert.equal(error.name, "ApiKeyNotFound");
                done();
            })
        });
        it('ApiKeyAuthReadCreateReadDeleteRead', function (done) {
            var numApiKeysBefore;
            var numApiKeysAfter;
            var apiKeyCreated;
            client.get('v1/keys')
            .then(function(apiKeys) {
                assert(apiKeys)
                numApiKeysBefore = apiKeys.length;
                return client.postPasswordRequired('v1/keys')
            })
            .then(function(apiKey){
                assert(apiKey)
                apiKeyCreated = apiKey.id;
                return client.get('v1/keys')
            })
            .then(function(apiKeys){
                console.log("apiKeys: ", apiKeys);
                numApiKeysAfter = apiKeys.length;
                assert((numApiKeysBefore + 1) === numApiKeysAfter);
                console.log("delete key: ", apiKeyCreated)
                return client.delete('v1/keys/' + apiKeyCreated)
            })
            .then(function(){
                return client.get('v1/keys')
            })
            .then(function(apiKeys) {
                assert.equal(numApiKeysBefore,apiKeys.length);
                done()
            })
            .fail(done);
        });
    });
   
});