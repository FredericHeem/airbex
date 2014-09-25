/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var config = require('./configTest.js')();
var debug = require('debug')('testDbUser');
var lproof = require('lproof')
var TestMngr = require('./TestMngr');

describe('LiabilityProof', function () {
    "use strict";
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    
    
    var verify_liability = function(root, partialTree){
        var ptree = lproof.deserializePartialTree(JSON.stringify(partialTree));
        assert(lproof.verifyTree(ptree, root.root))
    }
    
    before(function(done) {
        debug("before");
        testMngr.login().then(done).fail(done);
    });
    

    describe('LiabilityProofBTC', function () {
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
        var currency = "ltc";
        it('LiabilityGetAllLTC', function (done) {
            snowBot.liabilityGetAll(client, currency, function(err, root, partialTree){
                assert(!err);
                verify_liability(root, partialTree)
                done();
            })
        });
    });
});
