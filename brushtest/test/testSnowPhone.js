/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var config = require('./configTest.js')();
var num = require('num');
var debug = require('debug')('testPhone')
var SnowBot = require('./snow-bot');
var SnowChef = require('./snow-chef');
var TestMngr = require('./TestMngr');

describe('SnowPhone', function () {
    "use strict";
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var adminConfig = testMngr.clientConfig("alice");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    
    describe('PhoneKo', function () {
        it('StartPhoneVerifyNotAuthenticated', function (done) {
            var postData = {
                    "number": adminConfig.number,
                    "country": adminConfig.country
            };
            
            request(config.url).post('v1/users/verify/text/').send(postData).expect(401).end(function(err, res) {
                if (err) {
                     done(err);
                } else {
                    done();
                }
            });
        });
        
    });
    describe('PhoneOk', function () {
        before(function(done) {
            debug("before");
            testMngr.login()
            .then(done)
            .fail(done);
        });
        it('StartPhoneVerifyAuthenticated', function (done) {
            this.timeout(5*1000);
            var cookie = "session=" + client.sessionKey;
            debug("cookie %s", cookie);
            
            async.waterfall(
                    [
                     function(callback) {
                         snowBot.db.deletePhoneNumber(client.config.email, callback)
                     },
                     function(callback) {
                         var postData = {
                                 "number": client.config.number,
                                 "country": client.config.country
                         };
                         
                         request(config.url).post('v1/users/verify/text/').send(postData)
                         .set('cookie', cookie)
                         .expect('Content-Type', /json/)
                         .end(function (err, res) {
                             if (err) {
                                 console.log(err);
                             }
                             assert(!err);
                             callback();
                         });
                     },
                     function(callback) {
                         snowBot.db.queryUserPhoneCode(client.config.email, function(err, code){
                             debug("queryUserPhoneCode code %s", code)
                             callback(err, code)
                         })
                     },
                     function(code, callback) {
                         //assert(code)
                         debug("phone code %s", code)
                         var postData = {
                                 "code": code
                         };
                         request(config.url).post('v1/users/verify').send(postData)
                         .set('cookie', cookie)
                         .expect('Content-Type', /json/)
                         .expect(204)
                         .end(function (err, res) {
                             if (err) {
                                 debug(err);
                             }
                             //assert(!err);
                             callback();
                         });
                     },
                     function(callback) {
                         snowBot.db.getPhoneNumber(client.config.email, function(err, phoneNumber){
                             debug("getPhoneNumber code %s", phoneNumber)
                             assert(client.config.number)
                             callback(err, phoneNumber)
                         })
                     },
                     ],

                     function(err) {
                        done(err);
                    });
        });
        
    });
});