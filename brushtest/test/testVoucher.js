/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testVoucher')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

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
                console.log("vouchers ", result)
                assert(result.voucher);
                clientBob.post('v1/vouchers/' + result.voucher + '/redeem')
            })
            .then(function(){
                done();
            })
            .fail(done)
        });
       
    });
   
});