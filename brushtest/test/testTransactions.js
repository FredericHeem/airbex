/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testTransactions')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('Transactions', function () {
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
    after(function(done) {
        testMngr.stop().then(done).fail(done);
    });
    
    describe('TransactionPublic', function () {
        it('TransactionPublicAlice', function (done) {
            client.post('v1/transactions')
            .fail(function(err){
                assert(err)
                assert.equal(err.name, "NotAuthenticated")
                done()
            });
        });
        it('TransactionPublicCsvAlice', function (done) {
            client.get('v1/transactions/csv')
            .fail(function(err){
                assert(err)
                assert.equal(err.name, "NotAuthenticated")
                done()
            });
        });
    });
    
    describe('TransactionAuth', function () {
        before(function(done) {
            testMngr.login().then(done).fail(done);
        });
        it('TransactionAuthRead', function (done) {
            client.post('v1/transactions').then(function(transactions) {
                //console.log(transactions)
                assert(transactions)
                done()
            }).fail(done);
        });
        it('TransactionAuthCsv', function (done) {
            client.get('v1/transactions/csv').then(function(csv) {
                //console.log(csv)
                assert(csv)
                done()
            }).fail(done);
        });
    });
   
});