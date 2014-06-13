/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var config = require('./configTest.js')();
var debug = require('debug')('testDbUser');
var pg = require('pg');
var crypto = require('crypto');
var sjcl = require('sjcl');
var SnowBot = require('./snow-bot');
var SnowChef = require('./snow-chef');
var lproof = require('lproof')

describe('LiabilityProof', function () {
    "use strict";
    var url = config.url;
    var timeout = 1000 * 60 * 60;
    var alice_config = config.users[1];
    alice_config.url = config.url; 
    var client = new (require('../../client/index'))(alice_config);
    var snowBot = new SnowBot(config);
    var snowChef = new SnowChef(snowBot, config);
    
    var clients = []; 
    clients.push(client);
    
    var verify_liability = function(root, partialTree){
        var ptree = lproof.deserializePartialTree(JSON.stringify(partialTree));
        assert(lproof.verifyTree(ptree, root.root))
    }
    
    before(function(done) {
        debug("before");
        this.timeout(5 * 1000);
        snowChef.securitySession(clients, done)
    });
    
    describe('BlockChainBTC', function () {
        this.timeout(timeout);
        it('AddressBTCOk', function (done) {
            var address = "1MfWN6iGMJgHPfp1phyX8DK9g5ucV4GaLZ"
            request(config.url).get('v1/blockchain/btc/address/' + address).end(function(err, res) {
                assert.equal(res.statusCode, 200)
                var response = res.body;
                assert(response)
                assert.equal(response.status, "success")
                if (err) {
                    done(err);
                } else {
                    assert.equal(address, response.data.address)
                    console.log("bc returns ", JSON.stringify(response))
                    done();
                }
            });
        });
        // wait for block.io fix
//        it('AddressBTCKo', function (done) {
//            var address = "1MfWN6iGMJgHPfp1phyX8DK9g5ucV4GaLL"
//            request(config.url).get('v1/blockchain/btc/address/' + address).end(function(err, res) {
//                assert.equal(res.statusCode, 400)
//                var response = res.body;
//                assert(response)
//                assert(response.error);
//                done();
//            });
//        });
    });
    describe('LiabilityProofBTC', function () {
        this.timeout(timeout);
        var currency = "btc";
        it('LiabilityGetAllBTC', function (done) {
            snowBot.liabilityGetAll(client, currency, function(err, root, partialTree){
                
                assert(!err);
                assert(root);
                assert(partialTree);
                console.log("root: ", JSON.stringify(root));
                console.log("partialTree: ", JSON.stringify(partialTree));
                verify_liability(root, partialTree)
                done();
            })
        });
        
        it('RootTwice', function (done) {
            var rootFirst
            async.waterfall(
                    [
                     function(callback) {
                         snowBot.liabilityGetRoot(client, currency, callback)
                     },
                     function(rootFirst, callback) {
                         snowBot.liabilityGetRoot(client, currency, function(err, rootSecond){
                             console.log("Root 1: ", rootFirst);
                             console.log("Root 2: ", rootSecond);
                             callback(err)
                         })
                     },
                     ],
                     function(err) {
                        assert(!err)
                        done();
                    }
            );
        });
    });
    describe('LiabilityProofLTC', function () {
        this.timeout(timeout);
        var currency = "ltc";
        it('LiabilityGetAllLTC', function (done) {
            snowBot.liabilityGetAll(client, currency, function(err, root, partialTree){
                assert(!err);
                verify_liability(root, partialTree)
                done();
            })
        });
    });
    
    describe('AssetProofAll', function () {
        this.timeout(timeout);
        it('AssetProofAllOK', function (done) {
            snowBot.getAssetsAll(client, function(err, assetsAll){
                assert(!err);
                assert(assetsAll)
                done();
            })
        });
    });
    describe('AssetProofBTC', function () {
        this.timeout(timeout);
        var currency = "btc";
        it('AssetProofBTCOK', function (done) {
            snowBot.getAssets(client, function(err, assets){
                assert(!err);
                assert(assets)
                done();
            })
        });
    });
});
