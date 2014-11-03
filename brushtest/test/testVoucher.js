/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testVoucher')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');
var async = require('async');

describe('Voucher', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    var currency = "BTC";
    var amount = "0.1";
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    after(function(done) {
        testMngr.stop().then(done).fail(done);
    });
    
    describe('VoucherPublic', function () {
        it('VoucherPublicAlice', function (done) {
            client.post('v1/vouchers')
            .fail(function(err){
                assert.equal(err.name, "NotAuthenticated")
                done()
            })
            .fail(done)
        });
    });
    
    describe('VoucherAuth', function () {
        before(function(done) {
            debug("before");
            testMngr.login()
            .then(done)
            .fail(done);
        });
        it('VoucherRedeemInvalid', function (done) {
            var id = "84940CE0F316";
            client.post('v1/vouchers/' + id + '/redeem')
            .fail(function(err){
                assert.equal(err.name, "VoucherNotFound")
                done();
            })
            .fail(done)
        });
        it('VoucherCreateBadRequest', function (done) {
            client.postPasswordRequired('v1/vouchers/')
            .fail(function(err){
                assert.equal(err.name, "BadRequest")
                done();
            })
            .fail(done)
        });
        it('VoucherCreateOk', function (done) {
            var param = {
                    amount: amount,
                    currency: currency
            }
            client.postPasswordRequired('v1/vouchers/', param)
            .then(function(result){
                //console.log("vouchers ", result)
                assert(result.voucher);
                clientBob.post('v1/vouchers/' + result.voucher + '/redeem')
            })
            .then(function(){
                done();
            })
            .fail(done)
        });
        it('VoucherAuthList', function (done) {
            var param = {
                    amount: amount,
                    currency: currency
            }
            client.postPasswordRequired('v1/vouchers/', param)
            .then(function(){
                return client.get('v1/vouchers')
            })
            .then(function(vouchers){
                //console.log(vouchers)
                assert(vouchers)
                assert(vouchers.length > 0)
                async.forEach(vouchers, function(voucher, callback) {
                    client.post('v1/vouchers/' + voucher.code + '/redeem')
                    .then(function(result){
                        assert(result)
                        assert(result.cancelled)
                        callback()
                    })
                    .fail(callback);
                }, function(err) {
                    //console.log("redeem voucher done: " + err ? err : "");
                    //if(err) return done(err)
                    
                });
            })
            .then(function(){
                return client.get('v1/vouchers')
            })
            .then(function(vouchers){
                //console.log(vouchers)
                assert(vouchers)
                assert.equal(vouchers.length, 0)
                done()
            })
            .fail(done)
        });
       
    });
   
});