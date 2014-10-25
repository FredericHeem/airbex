/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testCurrencies')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('Currencies', function () {
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
    
    describe('CurrenciesPublic', function () {
        it('CurrenciesPublicAlice', function (done) {
            client.currencies().then(function(currencies) {
                assert(currencies)
                done()
            }).fail(done);
        });
    });
    
    describe('CurrenciesAuth', function () {
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
        it('CurrenciesAuthAlice', function (done) {
            client.currencies().then(function(currencies) {
                //console.log(currencies);
                assert(currencies)
                done()
            }).fail(done);
        });
    });
   
});