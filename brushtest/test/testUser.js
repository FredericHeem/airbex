/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testUser')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('User', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    
    describe('UserPublic', function () {
        it('UserPublicAlice', function (done) {
            var param = {
                    language:"UK",
                    username:'pippo'
            }
            client.patch('v1/users/current', param)
            .fail(function(err){
                assert.equal(err.name, "NotAuthenticated")
                done()
            })
            .fail(done)
        });
    });
    
    describe('Users', function () {
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
        it('UserPatchInvalid', function (done) {
            var param = {
            }
            client.patch('v1/users/current', param)
            .then(function(){
                
                done()
            })
            .fail(function(err){
                assert(err);
                assert.equal(err.name, "NoUpdates");
                done()
            })
            .fail(done)
        });
        it('UserPatchOk', function (done) {
            var param = {
                    language:"UK",
                    username:'pippo'
            }
            client.patch('v1/users/current', param)
            .then(function(){
                
                done()
            })
            .fail(done)
        });
        it('UserIdentityOk', function (done) {
            var user_id;
            snowBot.db.getUserIdFromEmail(client.config.email)
            .then(function(user){
                user_id = user.user_id
                var param = {
                        first_name:client.first_name || client.name,
                        last_name:client.last_name || " ",
                        country:client.country,
                        address:"road",
                        city:"hackerville",
                        postal_area: "3031",
                        poi_approved:false, 
                        poa_approved:false
                };
                console.log("param: ", JSON.stringify(param))
                clientAdmin.adminUserPatch(user_id, param)
            })
            .then(function(){
                var param = {
                        firstName: "Frederocco", 
                        lastName: "NoFreddo",
                        address:"Bitcoin avenue",
                        country:"IT",
                        city: "Cagliari",
                        postalArea:"3301"
                }
                return client.post('v1/users/identity', param)
            })
            .then(function(){
                var param = {
                        first_name:client.first_name || client.name,
                        last_name:client.last_name || " ",
                        country:client.country,
                        address:"road",
                        city:"hackerville",
                        postal_area: "3031",
                        poi_approved:true, 
                        poa_approved:true
                };
                console.log("param: ", JSON.stringify(param))
                clientAdmin.adminUserPatch(user_id, param)
            })
            .then(function(){
                var param = {
                        firstName: "Frederocco", 
                        lastName: "NoFreddo",
                        address:"Bitcoin avenue",
                        country:"IT",
                        city: "Cagliari",
                        postalArea:"3301"
                }
                return client.post('v1/users/identity', param)
            })
            .fail(function(err){
                assert.equal(err.name, "IdentityAlreadySet");
                done()
            })
            .fail(done)
        });
    });
   
});