/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var config = require('./configTest.js')();
var num = require('num');
var debug = require('debug')('testAdminCredit');
var pg = require('pg');
var crypto = require('crypto')
var SnowBot = require('./snow-bot');
var SnowChef = require('./snow-chef');

describe('Admin', function () {
    "use strict";
    var url = config.url_admin;
    var timeout = 1000 * 60 * 60;
    
    var snowBot = new SnowBot(config);
    var snowChef = new SnowChef(snowBot, config);
    var admin_config = config.users[0];
    admin_config.url = config.url; 
    var alice = config.users[1];
    
    before(function(done) {
        debug("before")
        snowBot.db.pgClient.connect(function(err) {
            if (err) {
                debug("db connect error: %s, connection: %s", err, config.pg_write_url);
                done(err);
            } else {
                done();
            }
        });
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
        this.timeout(timeout);
        var client = new (require('../../client/index'))(admin_config);
        
        it('AdminBankCreditsNotAuthenticated', function (done) {
            client.bankCredits(function(err, bankCredits) {
                assert(err)
                debug("bankCredits: %s", err)
                done();
            })
        });
    });
    describe('AdminAuthenticatedCredit', function () {
        this.timeout(timeout);
        var adminClient = new (require('../../client/index'))(admin_config);
        
        before(function(done) {
            debug("before")
            adminClient.securitySession(function(err, sessionKey) {
                if (err) throw err
                assert(sessionKey)
                debug("securitySession key %s", sessionKey)
                done()
            });
        });
//        it('AdminBankCreditsCreateOk', function (done) {
//            var bankCreditInfo = {
//                    "user_id" : "13",
//                    "amount" : "1",
//                    "currency_id" : "EUR",
//                    "reference" : "my first deposit"
//            }
//            adminClient.bankCreditCreate(bankCreditInfo, function(err, bankCreditResult) {
//                if (err) throw err
//                debug("bankCreditCreate: ", JSON.stringify(bankCreditResult));
//                done();
//            })
//        });
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
                    "currency_id" : "EUR",
                    "reference" : "my first deposit for 1000"
            }
            snowChef.createAndValidateBankCredit(config.users, adminClient, bankCreditInfo, done)
        });         
//        it('AdminBankCreditsValidateOk', function (done) {
//            var bankValidateInfo = {
//                "bank_credit_id" : "8"
//            }
//            client.bankCreditValidate(bankValidateInfo, function(err, bankValidateResult) {
//                if (err) throw err
//                debug("bankCreditValidate: ",  bankValidateResult)
//                done();
//            })
//        });
//        it('AdminBankCreditsCancelOk', function (done) {
//            var bankCancelInfo = {
//                "bank_credit_id" : "1"
//            }
//            client.bankCreditCancel(bankCancelInfo, function(err, bankCancelResult) {
//                if (err) throw err
//                debug("bankCreditCancel: ",  bankCancelResult)
//                done();
//            })
//        });        
        it('AdminBankCreditsCreateAndValidateOk', function (done) {
            var bankCreditInfo = {
                    "amount" : "1000",
                    "currency_id" : "EUR",
                    "reference" : "my first deposit for 1000"
            }
            
            snowBot.createAndValidateBankCredit(adminClient, alice.email, bankCreditInfo, done)
        });
        it('AdminBankCreditsCreateAndCancelOk', function (done) {
            var bankCreditInfo = {
                    "user_id" : "15",
                    "amount" : "2000",
                    "currency_id" : "EUR",
                    "reference" : "my first deposit for 1000"
            }
            createAndCancelBankCredit(adminClient, bankCreditInfo, done)
        });
    });
    
});
