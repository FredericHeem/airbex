var assert = require('assert');
var request = require('supertest');
var config = require('./configTest.js')();
var debug = require('debug')('testDbUser');
var lproof = require('lproof')
var TestMngr = require('./TestMngr');

describe('AssetProof', function () {
    "use strict";
    var testMngr = new TestMngr(config);
    var quote_currency = config.quote_currency;
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    
    before(function(done) {
        testMngr.start().then(testMngr.login).then(done).fail(done);
    });
    after(function(done) {
        testMngr.stop().then(done).fail(done);
    });
    
    describe('UploadAsset', function () {
        var currency = "btc";
        var file_path = "/Users/frederic/VirtualBoxShared/airbex-btc-assets.json"
        it('UploadAssetOK', function (done) {
            snowBot.uploadAsset(clientAdmin, file_path, function(err){
                assert(!err);
                done();
            })
        });
    });
    
    describe('AssetProofAll', function () {
        it('AssetProofAllOK', function (done) {
            snowBot.getAssetsAll(client, function(err, assetsAll){
                assert(!err);
                assert(assetsAll)
                done();
            })
        });
    });
    describe('AssetProofBTC', function () {
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
