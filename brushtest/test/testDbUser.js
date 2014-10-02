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
var TestMngr = require('./TestMngr');

describe('Users', function () {
    "use strict";
    var url = config.url;
    var timeout = 1000 * 60 * 60;
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    
    var clients = [];
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    
    var createUsers = function (numClient){
        var clients = [];
        for(var i = 0; i < numClient; i++){
            createNextUserInfo(clients);
        }
        return clients;
    }
    
    var createNextUserInfo = function (clients){
        var userData = {
                "email": "user" + clients.length + "-" + crypto.randomBytes(10).toString('hex') + "@nomail.com",
                "password": "password"
        };
        clients.push(userData);
        return userData;
    }
    
    describe('UserCreate', function () {
        this.timeout(timeout);
        it('GetUserCount', function (done) {
            snowBot.db.getUserCount(function(count){
                debug("GetUserCount: %s", count)
                done();
            });
        });
        
        it('CreateAdmin', function (done) {
            var admin = config.users[0];
            snowBot.userCreateAndVerify(admin, function(err){
                if(err && err.name == 'EmailAlreadyInUse'){
                    done();
                } else if(err){
                    done(err);
                } else {
                    done();
                }
            });
        });
        
        it('CreateUserOne', function (done) {
            var clients = [];
            var user = createNextUserInfo(clients);
            snowBot.userCreateAndVerify(user, done);
        });
        
        it('CreateUsersStatic', function (done) {
            this.timeout(10 * 1000);
            async.forEachLimit(config.users, 1, function(client, callback) {
                snowBot.userCreateAndVerify(client, function(err){
                    if(err && err.name != 'EmailAlreadyInUse'){
                        callback(err);
                    } else {
                        callback()
                    }
                })
              }, function(err){
                 debug("CreateUsers done: " + err);
                 assert(!err);
                 done();
            });
        });
        
    
        
        it('CreateUsersRandom', function (done) {
            this.timeout(10000000);
            async.forEachLimit(createUsers(config.userMax), 100, function(client, callback) {
                snowBot.userCreateAndVerify(client, function(err){
                    callback(err);
                });
              }, function(err){
                 debug("CreateUsers done: " + err);
                 assert(!err);
                 done();
            });
        });
    });
    describe('PatchUsers', function () {
        before(function(done) {
            debug("before");
            clientAdmin.login().then(done).fail(done);
        });
        it('PatchUsers', function (done) {
            async.forEachLimit(config.users, 1, function(client, callback) {
                snowBot.db.getUserIdFromEmail(client.email)
                .then(function(user_id){
                    console.log("client: ", JSON.stringify(client))
                    var param = {
                        first_name:client.first_name || client.name,
                        last_name:client.last_name || " ",
                        country:client.country,
                        address:"road",
                        city:"hackerville",
                        postal_area: "3031",
                        poi_approved:client.poi || false, 
                        poa_approved:client.poa || false
                        };
                    console.log("param: ", JSON.stringify(param))
                    return clientAdmin.adminUserPatch(user_id, param);
                })
                .then(callback)
                .fail(function(err){
                    console.error(err)
                    callback(err)
                })
              }, function(err){
                 debug("CreateUsers done: " + err);
                 assert(!err);
                 done();
            });
        });
    });
});
