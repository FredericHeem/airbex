/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testWithdrawBank')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');
var num = require('num');

describe('WithdrawBank', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    
    describe('WithdrawBankPublic', function () {
        it('WithdrawBankPublicAlice', function (done) {
            client.get("v1/withdraws")
            .fail(function(err){
                assert.equal(err.name, "NotAuthenticated")
                done()
            });
        });
    });
    
    describe('WithdrawBankAuth', function () {
        var bankAccountId;
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login()
            .then(function(){
                return client.get('v1/bankAccounts')
            })
            .then(function(bankAccounts) {
                assert(bankAccounts);
                bankAccountId = bankAccounts[0].id;
                console.log("bankAccountId: ", bankAccountId)
                //console.log(bankAccounts)
                done()
            }).fail(done);
        })
        it('WithdrawBankAuthList', function (done) {
            client.get("v1/withdraws")
            .then(function(withdraws) {
                assert(withdraws)
                console.log(withdraws)
                done()
            }).fail(done);
        });
        it('WithdrawBankInvalidParam', function (done) {
            var param = {};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                console.log(err);
                assert.equal(err.name, "BadRequest")
                done()
            });
        });
        it('WithdrawBankNegativeAmount', function (done) {
            var param = {bankAccount:bankAccountId, amount:"-1", currency:"EUR"};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                console.log(err);
                assert.equal(err.name, "BadRequest")
                done()
            });
        });
        it('WithdrawBankNullAmount', function (done) {
            var param = {bankAccount:bankAccountId, amount:"0", currency:"EUR"};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                console.log(err);
                assert.equal(err.name, "AmountTooSmall")
                done()
            });
        });
        it('WithdrawBankAmountTooHigh', function (done) {
            var param = {bankAccount:bankAccountId, amount:"10000000", currency:"EUR"};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                console.log(err);
                assert.equal(err.name, "AmountTooHigh")
                done()
            });
        });
        it('WithdrawBankAmountNoFunds', function (done) {
            var param = {bankAccount:bankAccountId, amount:"50000", currency:"CZK"};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                console.log(err);
                assert.equal(err.name, "NoFunds")
                done()
            });
        });
        it('WithdrawBankInvalidBankAccount', function (done) {
            var param = {bankAccount:99999, amount:"1000", currency:"EUR"};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                console.log(err);
                assert.equal(err.name, "BankAccountNotFound")
                done()
            });
        });
        it('WithdrawBankOk', function (done) {
            var param = {bankAccount:bankAccountId, amount:"1000", currency:"EUR"};
            client.post("v1/withdraws/bank", param)
            .then(function(){
                return client.get("v1/withdraws")
            }).then(function(withdraws){
                assert(withdraws);
                var lastWithdraw = withdraws[0]
                assert(lastWithdraw);
                console.log(lastWithdraw)
                assert.equal(lastWithdraw.currency, "EUR");
                assert.equal(lastWithdraw.state, "requested");
                assert(num(param.amount).eq(num(lastWithdraw.amount)))
                done()
            }).fail(done)
        });
        
        it('WithdrawBankInvalidCurrency', function (done) {
            var param = {bankAccount:bankAccountId, amount:"1000", currency:"ABC"};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                console.log(err);
                assert.equal(err.name, "InvalidCurrency")
                done()
            });
        });
        it('WithdrawBankCryptoCurrency', function (done) {
            var param = {bankAccount:bankAccountId, amount:"1", currency:"BTC"};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                console.log(err);
                assert.equal(err.name, "CannotWithdrawNonFiatToBank")
                done()
            });
        });
    });
   
});