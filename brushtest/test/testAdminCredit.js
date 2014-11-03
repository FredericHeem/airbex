/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var config = require('./configTest.js')();
var debug = require('debug')('testAdminCredit');


describe('Admin', function () {
    "use strict";
    var TestMngr = require('./TestMngr');
    var testMngr = new TestMngr(config);
    var quote_currency = config.quote_currency;
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    after(function(done) {
        testMngr.stop().then(done).fail(done);
    });
    function createAndCancelBankCredit(client, bankCreditInfo, done) {
        client.bankCreditCreate(bankCreditInfo)
        .then(function(bankCreditResult) {
            debug("bankCreditCreate: ", JSON.stringify(bankCreditResult));
            var bankCancelInfo = {
                "bank_credit_id" : bankCreditResult.id
            };
            return bankCancelInfo;
        }).then(function(bankCancelInfo){
            client.bankCreditCancel(bankCancelInfo)
            .then(function(bankCancelResult) {
                done();
            }).fail(done)
        })
        .fail(done)
    }
    
    describe('AdminNotAuthenticated', function () {
        var client = testMngr.client("admin");
        it('AdminBankCreditsNotAuthenticated', function (done) {
            client.bankCredits()
            .fail(function(err){
                assert(err)
                assert.equal(err.name, 'NotAuthenticated')
                done()
            })
        });
    });

    describe('AdminAuthenticated', function () {
        var adminClient = testMngr.client("admin");
        
        before(function(done) {
            debug("before")
            adminClient.securitySession().fail(done).finally(done);
        });
        
        it('AdminBankCreditsGetOk', function (done) {
            adminClient.bankCredits()
            .then(function(bankCredits) {
                assert(bankCredits)
                debug("bankCredits: ", bankCredits)
                done();
            })
            .fail(done)
        });
        it('AdminBankCreditsCreateAll', function (done) {
            async.forEach(config.currenciesFiat, function(fiats, callback){
                var bankCreditInfo = {
                        "amount" : "1000",
                        "currency_id" : fiats,
                        "reference" : "my first deposit for 1000"
                }
                snowChef.createAndValidateBankCredit(config.users, adminClient, bankCreditInfo, callback)
            }, function(err) {
                debug("securitySession done: " + err ? err : "");
                done(err);
            });
        });
        
        it('AdminBankCreditsCreateAndValidateOk', function (done) {
            var bankCreditInfo = {
                    "amount" : "1000",
                    "currency_id" : quote_currency,
                    "reference" : "my first deposit for 1000"
            }
            
            snowBot.createAndValidateBankCredit(adminClient, testMngr.clientConfig('alice').email, bankCreditInfo, done)
        });
        it('AdminBankCreditsCreateAndCancelOk', function (done) {
            var bankCreditInfo = {
                    "user_id" : "15",
                    "amount" : "2000",
                    "currency_id" : quote_currency,
                    "reference" : "my first deposit for 1000"
            }
            createAndCancelBankCredit(adminClient, bankCreditInfo, done)
        });
    });
    
});
