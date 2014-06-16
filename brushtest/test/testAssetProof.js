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

describe('AssetProof', function () {
    "use strict";
    var clients = [];
    var url = config.url;
    var timeout = 1000 * 60 * 60;
    var admin_config = config.users[0];
    admin_config.url = url; 
    var admin = new (require('../../client/index'))(admin_config);
    var alice_config = config.users[1];
    alice_config.url = config.url; 
    var client = new (require('../../client/index'))(alice_config);
    var snowBot = new SnowBot(config);
    var snowChef = new SnowChef(snowBot, config);
    
    clients.push(admin)
    clients.push(client);
    
    before(function(done) {
        debug("before");
        this.timeout(5 * 1000);
        snowChef.securitySession(clients, done)
    });
    
    describe('UploadAsset', function () {
        var currency = "btc";
        var file_path = "/Users/frederic/VirtualBoxShared/airbex-btc-assets.json"
        it('UploadAssetOK', function (done) {
            snowBot.uploadAsset(admin, file_path, function(err){
                assert(!err);
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
            snowBot.getAssets(client, currency, function(err, asset){
                assert(!err);
                assert(asset);
                assert(asset.currency)
                assert(asset.blockhash)
                assert(asset.message)
                assert(asset.signatures)
                done();
            })
        });
    });

});
