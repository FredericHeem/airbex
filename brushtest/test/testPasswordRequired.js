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
            client.withdrawCrypto(withdrawParam, function(err) {
                console.log("test error ", JSON.stringify(err))
                assert(!err || err.name === "NoFunds")
                done()
            })
        });
        it('TestWithdrawCryptoBTCKo', function (done) {
            var withdrawParam = {
                    currency:'BTC',
                    address:clientConfig.btc_deposit_address,
                    amount:'10000000'
            };
            
            client.withdrawCryptoRaw(null, withdrawParam, function(err, res, body) {
                assert(res)
                console.log("res ", res.statusCode);
                assert.equal(body.name, "PasswordRequired");
                
                assert(body.token);
                client.withdrawCryptoRaw("invalidsession", withdrawParam, function(err, res, body) {
                    assert(res)
                    console.log("res ", res.statusCode);
                    assert.equal(body.name, "PasswordInvalid");
                    
                    assert(body.token);
                    var session = client.keyFromCredentials(body.token, clientConfig.email, clientConfig.password);
                    client.withdrawCryptoRaw(session, withdrawParam, function(err, res, body) {
                        assert(res)
                        console.log("res ", res.statusCode);
                        assert.equal(res.statusCode, 500)
                        assert.notEqual(body.name, "PasswordInvalid");
                        console.log("body ", body)
                        //assert(body.token);
                        done()
                        
                    })
                    
                })
                
            })
        });
    });
});