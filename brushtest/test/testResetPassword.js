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
    
    describe('ResetPassword', function () {
        before(function(done) {
            snowBot.db.restoreResetPassword(clientConfig.email).then(done, done)
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
        it('ResetPasswordMustConfirmEmailFirst', function (done) {
            var param = {
                    email: clientConfig.email,
            };
            client.post('v1/resetPassword', param)
            .then(function(result){
                assert(result); 
                var end = {
                        email: clientConfig.email,
                        key: client.getUserKey(clientConfig.email, clientConfig.password)
                }
                return client.post('v1/resetPassword/end', end)
            })
            .then(function(){
                console.log("ResetPasswordMustConfirmEmailFirst error");
                assert(false);
            })
            .fail(function(err){
                console.log(err)
                assert.equal(err.name,"MustConfirmEmailFirst");
                done();
            })
        });
        it('ResetPasswordOkTwice', function (done) {
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
        it('ResetPasswordBeginContinueEnd', function (done) {
            var param = {
                    email: clientConfig.email
            };
            client.post('v1/resetPassword', param)
            .then(function(result){
                assert(result);
                return snowBot.db.getResetPasswordCode(clientConfig.email)
            })
            .then(function(result){
                assert(result.reset_email_code);
                return client.get('v1/resetPassword/continue/' + result.reset_email_code)
            })
            .then(function(){
                var end = {
                        email: clientConfig.email,
                        key: client.getUserKey(clientConfig.email, clientConfig.password)
                }
                return client.post('v1/resetPassword/end', end)
            })
            .then(done)
            .fail(done);
        });
        it('ResetPasswordContinueInvalidCode', function (done) {
            client.get('v1/resetPassword/continue/eb38ebce9152e2e1821a')
            .fail(function(err){
                assert.equal(err.name, "ResetPasswordCodeInvalid");
                done();
            });
        });
        it('ResetPasswordEndNoSuchUser', function (done) {
            var param = {
                    email: "justin.time@mail.com",
                    key:client.getUserKey(clientConfig.email, clientConfig.password)
            };
            client.post('v1/resetPassword/end', param)
            .fail(function(err){
                console.error(err)
                assert.equal(err.name,"MustConfirmEmailFirst");
                done()
            })
        });
        it('ResetPasswordEndInvalidKey', function (done) {
            var param = {
                    email: "justin.time@mail.com",
                    key:"123456"
            };
            client.post('v1/resetPassword/end', param)
            .fail(function(err){
                assert.equal(err.name,"BadRequest");
                done()
            })
            .fail(done)
        });
        it('ResetPasswordEndInvalidEmail', function (done) {
            var param = {
                    email: "justin.time mail.com",
                    key:client.getUserKey(clientConfig.email, clientConfig.password)
            };
            client.post('v1/resetPassword/end', param)
            .fail(function(err){
                assert.equal(err.name,"BadRequest");
                done()
            })
            .fail(done)
        });
    });
    
   
   
});