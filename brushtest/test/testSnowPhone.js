/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var config = require('./configTest.js')();
var num = require('num');
var debug = require('debug')('snowtest')
var SnowBot = require('./snow-bot');
var SnowChef = require('./snow-chef');

describe('SnowPhone', function () {
    "use strict";
    var admin_config = config.users[0];
    var alice_config = config.users[1];
    var bob_config = config.users[2];
    alice_config.url = config.url; 
    bob_config.url = config.url; 
    var client = new (require('../../client/index'))(alice_config);
    var client_bob = new (require('../../client/index'))(bob_config);
    var clients = [];
    clients.push(client);
    clients.push(client_bob);
    
    var snowBot = new SnowBot(config);
    var snowChef = new SnowChef(snowBot, config);
    

    
    describe('PhoneKo', function () {
        it('StartPhoneVerifyNotAuthenticated', function (done) {
            var postData = {
                    "number": admin_config.number,
                    "country": admin_config.country
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
            
            async.series(
                    [
                     function(callback) {
                         client.securitySession(callback)
                     },
                     function(callback) {
                         snowBot.db.pgClient.connect(function(err) {
                             if (err) {
                                 debug("db connect error: %s, connection: %s", err, config.pg_write_url);
                                 callback(err);
                             } else {
                                 debug("db connected");
                                 callback();
                             }
                         });
                     }
                     
                     ],

                     function(err) {
                        done(err);
                    });
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