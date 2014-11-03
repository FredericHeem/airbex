/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testActivities')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('Activities', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    
    before(function(done) {
        testMngr.start().then(done).fail(function(err){
            console.log("error", err);
            done(err)
        });
    });
    after(function(done) {
        testMngr.stop().then(done).fail(done);
    });
    describe('ActivitiesPublic', function () {
        it('ActivitiesPublicAlice', function (done) {
            client.activities()
            .fail(function(err){
                assert.equal(err.name, "NotAuthenticated")
                done()
            });
        });
    });
    
    describe('ActivitiesAuth', function () {
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
        it('ActivitiesAuthAlice', function (done) {
            client.activities().then(function(activities) {
                assert(activities);
                //console.log(activities);
                //console.log(client.createTableActivities(balances).toString())
                done()
            }).fail(done);
        });
    });
   
});