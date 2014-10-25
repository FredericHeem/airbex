/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var config = require('./configTest.js')();
var debug = require('debug')('testWithdraw')
var TestMngr = require('./TestMngr');

describe('WithdrawCrypto', function () {
    "use strict";
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var currency = 'BTC';
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    
    describe('WithdrawPublic', function () {
        it('WithdrawPublicAlice', function (done) {
            var withdrawParam = {
                    currency:currency,
                    address:clientConfig.btc_deposit_address,
                    amount:'1'
            };
            client.post("v1/BTC/out", withdrawParam)
            .fail(function(err){
                assert.equal(err.name, "NotAuthenticated")
                done()
            })
            .fail(done)
        });
        it('WithdrawVerifyWrongCode', function (done) {
            client.post("v1/withdraw/verify/6dc118b66468c783b530")
            .fail(function(err){
                assert.equal(err.name, "UnknownEmailVerifyCode")
                done()
            })
            .fail(done)
        });
    });
    
    describe('TestWithdrawCrypto', function () {
        before(function(done) {
            testMngr.login().then(done).fail(done);
        });
        it('TestWithdrawInvalidCurrency', function (done) {
            var withdrawParam = {
                    currency:'ABC',
                    address:clientConfig.btc_deposit_address,
                    amount:'10000000'
            };
            client.withdrawCrypto(withdrawParam).fail(function(err){
                assert(err);
                done()
            })
        });
        it('TestWithdrawCryptoBTCInvalidAddressChecksum', function (done) {
            var withdrawParam = {
                    currency:currency,
                    address:"12BzXgPgq3scersJWG7c5ku7BFDGfsDdYa",
                    amount:'1'
            };
            client.withdrawCrypto(withdrawParam).then(function() {
                done()
            }).fail(function(err){
                assert(err && err.name === "InvalidAddress")
                done()
            })
            .fail(done);
        });
        it('TestWithdrawCryptoBTCInvalidAddressLength', function (done) {
            var withdrawParam = {
                    currency:currency,
                    address:"Invalid",
                    amount:'1'
            };
            client.withdrawCrypto(withdrawParam)
            .fail(function(err){
                assert.equal(err.name, 'BadRequest')
                done()
            })
            .fail(done);
        });
        it('TestWithdrawCryptoBTCNegative', function (done) {
            var withdrawParam = {
                    currency:currency,
                    address:clientConfig.btc_deposit_address,
                    amount:'-100'
            };
            client.withdrawCrypto(withdrawParam)
            .fail(function(err){
                assert(err);
                assert.equal(err.name, 'BadRequest')
                done()
            })
            .fail(done);
        });
        it('TestWithdrawCryptoBTCNull', function (done) {
            var withdrawParam = {
                    currency:currency,
                    address:clientConfig.btc_deposit_address,
                    amount:'0'
            };
            client.withdrawCrypto(withdrawParam)
            .fail(function(err){
                assert(err);
                assert.equal(err.name, 'AmountTooSmall')
                done()
            })
            .fail(done);
        });
        it('TestWithdrawCryptoBTCTooHigh', function (done) {
            var withdrawParam = {
                    currency:currency,
                    address:clientConfig.btc_deposit_address,
                    amount:'1000000'
            };
            client.withdrawCrypto(withdrawParam)
            .fail(function(err){
                assert(err);
                assert.equal(err.name, 'AmountTooHigh')
                done()
            })
            .fail(done);
        });
        it('TestWithdrawCryptoBTCKo', function (done) {
            var withdrawParam = {
                    currency:currency,
                    address:clientConfig.btc_deposit_address,
                    amount:'1'
            };
            
            client.withdrawCryptoRaw(null, withdrawParam)
            .then(function(result) {
                var body = result.body;
                var res = result.res;
                assert(res)
                assert.equal(body.name, "PasswordRequired");
                assert(body.token);
            })
            .then(function(){
                return client.withdrawCryptoRaw("invalidsession", withdrawParam)
                .then(function(result) {
                    var res = result.res;
                    var body  = result.body;
                    assert(res)
                    assert.equal(body.name, "PasswordInvalid");
                    assert(body.token);
                    return body.token
                })
            })
            .then(function(token){
                var session = client.keyFromCredentials(token, clientConfig.email, clientConfig.password);
                //console.log("session ", session)
                client.withdrawCryptoRaw(session, withdrawParam)
                .then(function(result) {
                    var body = result.body;
                    var res = result.res;
                    //console.log("res ", res.statusCode);
                    //console.log("body ", body)
                    done()
                })
                .fail(done)
            })
            .fail(done);
        })
        it('TestWithdrawCryptoComplete', function (done) {
            this.timeout(10e3)
            var withdrawParam = {
                    currency:currency,
                    address:clientConfig.btc_deposit_address,
                    amount:'1'
            };
            snowBot.withdrawCryptoComplete(client, withdrawParam)
            .then(done)
            .fail(done);
           
        })
        it('TestWithdrawCryptoCancelAll', function (done) {
            snowBot.withdrawRequestCancel(client)
            .then(done)
            .fail(done);
        })
    });
});