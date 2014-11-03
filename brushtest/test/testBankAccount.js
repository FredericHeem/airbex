/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testBankAccount')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('BankAccount', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    var clientNoMoney = testMngr.client("nomoney");
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    after(function(done) {
        testMngr.stop().then(done).fail(done);
    });
    
    describe('BankAccountPublic', function () {
        it('BankAccountPublicAlice', function (done) {
            client.get('v1/bankAccounts')
            .fail(function(err){
                assert.equal(err.name, "NotAuthenticated")
                done()
            });
        });
    });
    
    describe('BankAccountAuth', function () {
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
        it('BankAccountAuthList', function (done) {
            client.get('v1/bankAccounts').then(function(bankAccounts) {
                assert(bankAccounts)
                //console.log(bankAccounts)
                done()
            }).fail(done);
        });
        it('BankAccountAuthAddKo', function (done) {
            var param = {
            }
            client.post('v1/bankAccounts', param)
            .fail(function(err){
                assert.equal(err.name, "NotEnoughInformation")
                done()
            });
        });
        it('BankAccountAuthAddOk', function (done) {
            var param = {
                    iban:"IE29AIBK93115212345678",
                    swiftbic:"DABAIE2D"
            }
            client.post('v1/bankAccounts', param)
            .then(function(result) {
                //assert(result)
                done()
            }).fail(done);
        });
        it('BankAccountAuthNoMoney', function (done) {
            var param = {
                    iban:"FR29AIBK93115212345678",
                    swiftbic:"DABAIE2D"
            }
            clientNoMoney.post('v1/bankAccounts', param)
            .then(function(result) {
                //assert(result)
                done()
            }).fail(done);
        });
    });
   
});