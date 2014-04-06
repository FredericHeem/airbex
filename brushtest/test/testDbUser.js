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

describe('Users', function () {
    "use strict";
    var url = config.url;
    var timeout = 1000 * 60 * 60;
    
    var snowBot = new SnowBot(config);
    
    var clients = [];
    
    before(function(done) {
        debug("before")
        snowBot.db.pgClient.connect(function(err) {
            if (err) {
                debug("db connect error: %s, connection: %s", err, config.pg_write_url);
                done(err);
            } else {
                debug("db connected");
                done();
            }
        });
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
                    if(err && err.name == 'EmailAlreadyInUse'){
                        callback();
                    } else if(err){
                        callback(err);
                    } else {
                        callback();
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
});
