/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testTwoFA')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');
var speakeasy = require('speakeasy');

function disableTfa(client, done){
    var param = {
            key:client.config.twoFaSecret,
            otp:client.getOtp(client.config.twoFaSecret)
    }
    client.post('v1/twoFactor/remove', param)
    .then(function(result) {
        done()
    })
    .fail(done);
}

describe('TwoFA', function () {
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
    
    describe('TwoFAPublic', function () {
        it('TwoFAPublicAlice', function (done) {
            client.post('v1/twoFactor/enable')
            .fail(function(err){
                assert.equal(err.name, "NotAuthenticated")
                done()
            })
            .fail(done)
        });
    });
    
    describe('TwoFAAuth', function () {
        before(function(done) {
            debug("before");
            testMngr.login().then(done).fail(done);
        });
        it('TwoFAEnableBadParam', function (done) {
            client.post('v1/twoFactor/enable')
            .fail(function(error){
                assert.equal(error.name, "BadRequest");
                done();
            })
            .fail(done)
        });
        it('TwoFAEnableWrongOtp', function (done) {
            var param = {
                    key:clientConfig.twoFaSecret,
                    otp:"123456"
            }
            client.post('v1/twoFactor/enable', param)
            .fail(function(error){
                assert.equal(error.name, "WrongOtp");
                done();
            })
            .fail(done)
        });
        it('TwoFaWhoami', function (done) {
            
            client.get('v1/whoami')
            .then(function(result) {
                assert(result)
                //console.log(result)
                done()
            })
            .fail(done);
        });
//        it('TwoFADisableOk', function (done) {
//            disableTfa(client, done)
//        });
        it('TwoFAEnableOk', function (done) {
            
            var param = {
                    key:clientConfig.twoFaSecret,
                    otp:client.getOtp(clientConfig.twoFaSecret)
            }
            client.post('v1/twoFactor/enable', param)
            .then(function(result) {
                return client.post('v1/twoFactor/enable', param)
            })
            .fail(function(err){
                assert(err.name,'TwoFactorAlreadyEnabled')
                done();
            })
            .fail(done)
        });
//        it('TwoFAEnable', function (done) {
//            var counter = Math.floor(+new Date() / 30e3)
//            var otp = speakeasy.hotp({
//                key: clientConfig.twoFaSecret,
//                encoding: 'base32',
//                counter: counter
//            })
//            var param = {
//                    key:clientConfig.twoFaSecret,
//                    otp:otp
//            }
//            client.post('v1/twoFactor/enable', param)
//            .then(function(result) {
//                console.log(result)
//                return client.postTwoFaRequired('v1/twoFactor/remove')
//            })
//            .then(function(){
//                done();
//            })
//            .fail(done);
//        });
        it('TwoFADisableOk1', function (done) {
            disableTfa(client, done)
        });
    });
   
});