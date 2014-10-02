/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testSend')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('Send', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    var clientBobConfig = testMngr.clientConfig("bob");
    var marketName = "BTCEUR";
    var currency = "BTC";
    describe('SendPublic', function () {
        it('SendPublicAlice', function (done) {
            client.post('v1/spend')
            .fail(function(err){
                assert.equal(err.name, "NotAuthenticated")
                done()
            });
        });
    });
    
    describe('SendAuth', function () {
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login()
            .then(done)
            .fail(done);
        });
        it('SendInvalidCurrency', function (done) {
            var param = {
                    email:clientConfig.email,
                    currency:"ABC",
                    amount:"1"
            }
            client.postPasswordRequired('v1/send', param)
            .fail(function(err){
                assert.equal(err.name, "InvalidCurrency")
                done();
            });
        });
        it('SendCurrencyFiat', function (done) {
            var param = {
                    email:clientConfig.email,
                    currency:"EUR",
                    amount:"1"
            }
            client.postPasswordRequired('v1/send', param)
            .fail(function(err){
                console.log(err)
                assert.equal(err.name, "CannotSendFiat")
                done();
            });
        });
        it('SendInvalidAmount', function (done) {
            var param = {
                    email:clientBobConfig.email,
                    currency:currency,
                    amount:"-1"
            }
            client.postPasswordRequired('v1/send', param)
            .fail(function(err){
                assert.equal(err.name, "BadRequest")
                done();
            });
        });
        it('SendInvalidNullAmount', function (done) {
            var param = {
                    email:clientBobConfig.email,
                    currency:currency,
                    amount:"0"
            }
            client.postPasswordRequired('v1/send', param)
            .fail(function(err){
                console.log(err);
                assert.equal(err.name, "AmountTooSmall")
                done();
            });
        });
        it('SendInvalidAmountTooLow', function (done) {
            var param = {
                    email:clientBobConfig.email,
                    currency:currency,
                    amount:"0.00001"
            }
            client.postPasswordRequired('v1/send', param)
            .fail(function(err){
                console.log(err);
                assert.equal(err.name, "AmountTooSmall")
                done();
            });
        });
        it('SendInvalidAmountTooHigh', function (done) {
            var param = {
                    email:clientBobConfig.email,
                    currency:currency,
                    amount:"100"
            }
            client.postPasswordRequired('v1/send', param)
            .fail(function(err){
                console.log(err);
                assert.equal(err.name, "AmountTooHigh")
                done();
            });
        });
        it('SendToItself', function (done) {
            var param = {
                    email:clientConfig.email,
                    currency:currency,
                    amount:"1"
            }
            client.postPasswordRequired('v1/send', param)
            .fail(function(err){
                console.log(err);
                assert.equal(err.name, "SendToItself")
                done();
            });
        });
    });
   
});