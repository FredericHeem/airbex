/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testSnow')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('SnowClient', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    
    var displayDepth = function(depth){
        if(!depth){
            console.error("Invalid depth")
            return
        }
        console.log(depth)
    }
    
    before(function(done) {
        debug("before");
        this.timeout(5 * 1000);
        testMngr.login().then(done).fail(done);
    });
    
    describe('UploadDoc', function () {
        it('UploadDocOk', function (done) {
            var file = '/Users/frederic/Downloads/a_style_logo_Mod3.jpg';
            snowBot.uploadDocument(client, file, function(err, res){
                assert(!err)
                done();
            })
        });
//        it('UploadDocTooBig', function (done) {
//            this.timeout(60*1000);
//            var file = '/Users/frederic/Downloads/bfg-1.11.0.jar';
//            snowBot.uploadDocument(client, file, function(err, res){
//                assert(res.statusCode == 400)
//                done();
//            })
//        });        
    });    
    describe('Whoami', function () {
        it('WhoamiAlice', function (done) {
            client.whoami(function(err, user) {
                if (err) throw err
                console.log(client.createTableUser(user).toString())
                done()
            });
        });
    });
    
    describe('Depth', function() {
        it('Depth', function(done) {
            client.depth(config.market, function(err, depth) {
                if (err) throw err
                displayDepth(depth)
                done()
            })
        });
    });

    describe('Balances', function () {
        it('BalancesAlice', function (done) {
            client.balances(function(err, balances) {
                if (err) throw err
                console.log(client.createTableBalances(balances).toString())
                done()
            });
        });
    });
   
});