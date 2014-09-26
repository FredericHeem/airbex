/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var config = require('./configTest.js')();
var debug = require('debug')('testAdminCredit');
var TestMngr = require('./TestMngr');

describe('Admin', function () {
    "use strict";
    var testMngr = new TestMngr(config);
    var quote_currency = config.quote_currency;
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    
    before(function(done) {
        testMngr.dbConnect().then(done).fail(done);
    });
    
    function createAndCancelBankCredit(client, bankCreditInfo, done) {
        client.bankCreditCreate(bankCreditInfo, function(err, bankCreditResult) {
            if (err) throw err
            debug("bankCreditCreate: ", JSON.stringify(bankCreditResult));
            var bankCancelInfo = {
                "bank_credit_id" : bankCreditResult.id
            };
            client.bankCreditCancel(bankCancelInfo, function(err, bankCancelResult) {
                if (err) throw err
                debug("bankCreditCancel: %s",  JSON.stringify(bankCancelResult));
                done();
            })
        })
    }
    
    describe('AdminNotAuthenticated', function () {
        var client = testMngr.client("admin");
        it('AdminBankCreditsNotAuthenticated', function (done) {
            client.bankCredits(function(err, bankCredits) {
                assert(err)
                debug("bankCredits: %s", err)
                done();
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
            adminClient.bankCredits(function(err, bankCredits) {
                if (err) throw err
                debug("bankCredits: ", bankCredits)
                done();
            })
        });
        it('AdminBankCreditsCreateAll', function (done) {
            var bankCreditInfo = {
                    "amount" : "10000",
                    "currency_id" : quote_currency,
                    "reference" : "my first deposit for 1000"
            }
            snowChef.createAndValidateBankCredit(config.users, adminClient, bankCreditInfo, done)
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
