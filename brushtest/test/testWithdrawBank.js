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
    var clientNoMoney = testMngr.client("nomoney");
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    
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
        var currencyFiat = "EUR"
        var bankAccountId;
        before(function(done) {
            debug("before");
            testMngr.login()
            .then(function(){
                return client.get('v1/bankAccounts')
            })
            .then(function(bankAccounts) {
                assert(bankAccounts);
                bankAccountId = bankAccounts[0].id;
                //console.log("bankAccountId: ", bankAccountId)
                //console.log(bankAccounts)
                done()
            }).fail(done);
        })
        it('WithdrawBankAuthList', function (done) {
            client.get("v1/withdraws")
            .then(function(withdraws) {
                assert(withdraws)
                //console.log(withdraws)
                done()
            }).fail(done);
        });
        it('WithdrawBankInvalidParam', function (done) {
            var param = {};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                assert.equal(err.name, "BadRequest")
                done()
            })
            .fail(done);
        });
        it('WithdrawBankNegativeAmount', function (done) {
            var param = {bankAccount:bankAccountId, amount:"-1", currency:currencyFiat};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                assert.equal(err.name, "BadRequest")
                done()
            })
            .fail(done);
        });
        it('WithdrawBankNullAmount', function (done) {
            var param = {bankAccount:bankAccountId, amount:"0", currency:currencyFiat};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                assert.equal(err.name, "AmountTooSmall")
                done()
            })
            .fail(done);
        });
        it('WithdrawBankAmountTooHigh', function (done) {
            var param = {bankAccount:bankAccountId, amount:"10000000", currency:currencyFiat};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                assert.equal(err.name, "AmountTooHigh")
                done()
            })
            .fail(done);
        });
        it('WithdrawBankAmountNoFunds', function (done) {
            clientNoMoney.get('v1/bankAccounts')
            .then(function(accounts){
                assert(accounts)
                var bid = accounts[0].id;
                console.log()
                var param = {bankAccount:bid, amount:"10000", currency:"EUR"};
                return clientNoMoney.post("v1/withdraws/bank", param)
            })
            .fail(function(err){
                assert(err)
                assert.equal(err.name, "NoFunds")
                done()
            })
            .fail(done);
        });
        it('WithdrawBankInvalidBankAccount', function (done) {
            var param = {bankAccount:99999, amount:"1000", currency:currencyFiat};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                assert.equal(err.name, "BankAccountNotFound")
                done()
            })
            .fail(done);
        });
        it('WithdrawBankOkSimple', function (done) {
            var param = {bankAccount:bankAccountId, amount:"1000", currency:currencyFiat};
            client.post("v1/withdraws/bank", param)
            .then(function(){
                return client.get("v1/withdraws")
            }).then(function(withdraws){
                assert(withdraws);
                var lastWithdraw = withdraws[0]
                assert(lastWithdraw);
                //console.log(lastWithdraw)
                assert.equal(lastWithdraw.currency, currencyFiat);
                assert.equal(lastWithdraw.state, "requested");
                assert(num(param.amount).eq(num(lastWithdraw.amount)))
                done()
            })
            .fail(done)
        });
        it('WithdrawBankAndCancel', function (done) {
            var amount = "1000";
            var param = {bankAccount:bankAccountId, amount:amount, currency:currencyFiat};
            var balanceBefore;
            var lastWithdraw;
            var numWithdraw;
            client.balance(currencyFiat).then(function(balance){
                balanceBefore = balance;
                return client.post("v1/withdraws/bank", param);
            })
            .then(function(){
                return client.get("v1/withdraws")
            }).then(function(withdraws){
                assert(withdraws);
                lastWithdraw = withdraws[0]
                assert(lastWithdraw);
                //console.log(lastWithdraw)
                assert.equal(lastWithdraw.currency, currencyFiat);
                assert.equal(lastWithdraw.state, "requested");
                assert(num(param.amount).eq(num(lastWithdraw.amount)))
                return client.balance(currencyFiat)
            }).then(function(balance){
                assert(num(balance.available).eq(num(balanceBefore.available).sub(num(amount))));
                assert(num(balance.hold).eq(num(balanceBefore.hold).add(num(amount))));
                assert(num(balance.balance).eq(num(balanceBefore.balance)));
                return client.delete("v1/withdraws/" + lastWithdraw.id); 
            }).then(function(){
                return client.balance(currencyFiat)
            }).then(function(balance){
                assert(num(balance.available).eq(num(balanceBefore.available)));
                assert(num(balance.hold).eq(num(balanceBefore.hold)));
                assert(num(balance.balance).eq(num(balanceBefore.balance)));
                done();
            })
            .fail(done)
        });
        it('WithdrawBankAndProcess', function (done) {
            var amount = "1000";
            var param = {bankAccount:bankAccountId, amount:amount, currency:currencyFiat};
            var balanceBefore;
            var lastWithdraw;
            var numWithdraw;
            client.balance(currencyFiat).then(function(balance){
                balanceBefore = balance;
                return client.post("v1/withdraws/bank", param);
            })
            .then(function(){
                return client.get("v1/withdraws")
            }).then(function(withdraws){
                assert(withdraws);
                lastWithdraw = withdraws[0]
                assert(lastWithdraw);
                //console.log(lastWithdraw)
                assert.equal(lastWithdraw.currency, currencyFiat);
                assert.equal(lastWithdraw.state, "requested");
                assert(num(param.amount).eq(num(lastWithdraw.amount)))
                return client.balance(currencyFiat)
            }).then(function(balance){
                assert(num(balance.available).eq(num(balanceBefore.available).sub(num(amount))));
                assert(num(balance.hold).eq(num(balanceBefore.hold).add(num(amount))));
                assert(num(balance.balance).eq(num(balanceBefore.balance)));
                return clientAdmin.patch("admin/withdraws/" + lastWithdraw.id, {state:'processing'}); 
            }).then(function(){
                return clientAdmin.post("admin/withdraws/" + lastWithdraw.id + "/complete"); 
            }).then(function(){
                return client.balance(currencyFiat)
            }).then(function(balance){
                assert(num(balance.available).eq(num(balanceBefore.available).sub(num(amount))));
                assert(num(balance.hold).eq(num(balanceBefore.hold)));
                assert(num(balance.balance).eq(num(balanceBefore.balance).sub(num(amount))));
                return client.get("v1/withdraws")
            }).then(function(withdraws){
                assert(withdraws);
                lastWithdraw = withdraws[0]
                assert(lastWithdraw);
                //console.log(lastWithdraw)
                assert.equal(lastWithdraw.state, "completed");
                done();
            })
            .fail(done)
        });
        it('WithdrawBankInvalidCurrency', function (done) {
            var param = {bankAccount:bankAccountId, amount:"1000", currency:"ABC"};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                assert.equal(err.name, "InvalidCurrency")
                done()
            })
            .fail(done);
        });
        it('WithdrawBankCryptoCurrency', function (done) {
            var param = {bankAccount:bankAccountId, amount:"1", currency:"BTC"};
            client.post("v1/withdraws/bank", param)
            .fail(function(err){
                assert(err)
                assert.equal(err.name, "CannotWithdrawNonFiatToBank")
                done()
            })
            .fail(done);
        });
    });
   
});