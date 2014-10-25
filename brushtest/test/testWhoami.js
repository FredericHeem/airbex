/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testWhoami')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('Whoami', function () {
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
    
    describe('WhoamiPublic', function () {
        it('WhoamiPublicAlice', function (done) {
            client.whoami()
            .fail(function(err){
                assert(err)
                assert.equal(err.name, "NotAuthenticated")
                done()
            });
        });
    });
    
    describe('WhoamiAuth', function () {
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
        it('WhoamiAuthAlice', function (done) {
            client.whoami()
            .then(function(user) {
                //console.log(client.createTableUser(user).toString())
                done()
            })
            .fail(done)
        });
    });
});