/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testPassword')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('Password', function () {
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
    
    describe('PasswordPublic', function () {
        it('PasswordPublicAlice', function (done) {
            client.post('v1/changePassword')
            .fail(function(err){
                assert(err)
                assert.equal(err.name, "NotAuthenticated")
                done()
            });
        });
    });
    
    describe('PasswordAuth', function () {
        before(function(done) {
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
     
        it('PasswordAuthNoKey', function (done) {
            client.postPasswordRequired('v1/changePassword')
            .fail(function(err){
                console.log("Err:", err);
                assert(err)
                assert.equal(err.name, "BadRequest")
                done()
            });
        });
        it('PasswordAuthInvalidKey', function (done) {
            var param = {key:"aa"};
            client.postPasswordRequired('v1/changePassword', param)
            .fail(function(err){
                console.log("Err:", err);
                assert(err)
                assert.equal(err.name, "BadRequest")
                done()
            });
        });
        it('PasswordAuthDuplicatedKey', function (done) {
            client.postPasswordRequired('v1/keys')
            .then(function(result){
                assert(result)
                assert(result.id)
                var param = {key:result.id};
                return client.postPasswordRequired('v1/changePassword', param)
            })
            .fail(function(err){
                console.log("Err:", err);
                assert(err)
                assert.equal(err.name, "DuplicatedKey")
                done()
            });
        });
        it('PasswordAuthOk', function (done) {
            var param = {key:client.getUserKey(clientConfig.email, "newpassword")};
            client.postPasswordRequired('v1/changePassword', param)
            .then(function(){
                var paramOld = {key:client.getUserKey(clientConfig.email, clientConfig.password)};
                return client.postPasswordRequired('v1/changePassword', paramOld)
            })
            .then(done)
            .fail(done);
        });
        
       
    });
   
});