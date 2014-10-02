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
    
    describe('ResetPassword', function () {
        before(function(done) {
            testMngr.dbConnect().then(function(){
                return snowBot.db.restoreResetPassword(clientConfig.email)
            })
            .then(done)
            .fail(function(err){
                console.log(err)
                done(err);
            });
        });
        
        it('ResetPasswordNoParam', function (done) {
            client.post('v1/resetPassword')
            .fail(function(err){
                assert(err);
                assert.equal(err.name, "BadRequest");
                done();
            });
        });
        it('ResetPasswordInvalidParam', function (done) {
            var param = {
                    email: "a"
            };
            client.post('v1/resetPassword', param)
            .fail(function(err){
                assert(err);
                assert.equal(err.name, "BadRequest");
                done();
            });
        });
        it('ResetPasswordNoSuchUser', function (done) {
            var param = {
                    email: "alain.proviste@mail.com"
            };
            client.post('v1/resetPassword', param)
            .then(function(result){
                assert(result);
                done();
            })
            .fail(done);
        });
        it('ResetPasswordOk', function (done) {
            var param = {
                    email: clientConfig.email
            };
            client.post('v1/resetPassword', param)
            .then(function(result){
                assert(result);
                return client.post('v1/resetPassword', param)
            })
            .then(function(result){
                assert(result);
                done();
            }).fail(done);
        });
    });
    
   
   
});