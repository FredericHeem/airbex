/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var config = require('./configTest.js')();
var debug = require('debug')('PasswordRequired')
var TestMngr = require('./TestMngr');

describe('TestPasswordRequired', function () {
    "use strict";
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    
    before(function(done) {
        testMngr.dbConnect()
        .then(testMngr.login)
        .then(done)
        .fail(done);
    });

    describe('TestWithdrawCrypto', function () {
        it('TestWithdrawCryptoBTCOk', function (done) {
            var withdrawParam = {
                    currency:'BTC',
                    address:clientConfig.btc_deposit_address,
                    amount:'10000000'
            };
            client.withdrawCrypto(withdrawParam).then(function() {
                done()
            }).fail(function(err){
                assert(err && err.name === "NoFunds")
                done()
            })
        });
        it('TestWithdrawCryptoBTCKo', function (done) {
            var withdrawParam = {
                    currency:'BTC',
                    address:clientConfig.btc_deposit_address,
                    amount:'10000000'
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
                console.log("session ", session)
                client.withdrawCryptoRaw(session, withdrawParam)
                .then(function(result) {
                    var body = result.body;
                    var res = result.res;
                    console.log("res ", res.statusCode);
                    console.log("body ", body)
                    done()
                })
                .fail(done)
            })
            .fail(done);
        })
    });
});