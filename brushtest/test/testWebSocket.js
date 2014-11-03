/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var _ = require('lodash');
var config = require('./configTest.js')();
var debug = require('debug')('WebSocket');
var Airbex = require('airbex-client');
var TestMngr = require('./TestMngr');

describe('WebSocket', function () {
    "use strict";

    var testMngr = new TestMngr(config);
    var client = testMngr.client("alice");
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    
    describe('WebSocketKo', function () {
        this.timeout(5e3);
        it('ConnectKo', function (done) {
            var apiwsKo = new Airbex.WebSocketClient({url:"http://localhost:1234"});
            apiwsKo.start().fail(function(err){
                assert(err);
                done();
            })
            .fail(done)
        });
        it('NoOptions', function (done) {
            var apiwsKo = new Airbex.WebSocketClient();
            apiwsKo.start().then(done, done);
        });
    });
    
    describe('WebSocketPublic', function () {
        var apiws = new Airbex.WebSocketClient({url:config.url});
        before(function(done) {
            apiws.start().then(done, done);
        });
        after(function(done) {
            apiws.stop();
            done();
        });
        it('MarketsPublicOk', function (done) {
            this.timeout(5e3);
            apiws.getMarkets()
            .done(function(markets){
                assert(markets)
                done()
            });
        });
        it('MarketsInfoNotAuthenticated', function (done) {
            apiws.getMarketsInfo()
           .fail(function(error){
               assert(error)
               assert.equal(error.name, "NotAuthenticated")
           })
           .then(done, done);
        });
        it('DepthPublicOk', function (done) {
            this.timeout(10e3);
            apiws.getMarkets()
           .done(function(markets){
               _.each(markets, function(market, index){
                   apiws.getDepth(market.id).done(function(){
                       if((index + 1) == markets.length){
                           done()
                       }
                   })
               })
           });
        });
        it('CurrenciesPublicOk', function (done) {
            apiws.getCurrencies()
           .done(function(currencies){
               assert(currencies)
               done()
           });
        });
        it('BalanceNotAuthenticated', function (done) {
            apiws.getBalances()
           .fail(function(error){
               assert(error)
               assert.equal(error.name, "NotAuthenticated")
           })
           .then(done, done);
        });
        it('Bootstrap', function (done) {
            apiws.bootstrap().then(function(results){
                assert(results.currencies)
                assert(results.markets)
                done();
            }, done);
        });
    });
    describe('WebSocketApiKey', function () {
        var apiws = new Airbex.WebSocketClient({
            url:config.url,
            apiKey:client.config.apiKey
        });
        before(function(done) {
            apiws.start().fail(done)
            .then(done, done);
        });
        it('MarketsAuthenticatedOk', function (done) {
            apiws.getMarkets()
           .then(function(markets){
               assert(markets)
           })
           .then(done, done);
        });
        it('MarketsInfoAuthenticatedOk', function (done) {
            apiws.getMarketsInfo()
           .then(function(marketsInfo){
               assert(marketsInfo)
           })
           .then(done, done);
        });
        it('CurrenciesAuthenticatedOk', function (done) {
            apiws.getCurrencies()
           .then(function(currencies){
               assert(currencies)
           })
           .then(done, done);
        });
        it('BalanceAuthenticatedOk', function (done) {
            apiws.getBalances()
           .then(function(balances){
               assert(balances)
           })
           .then(done, done);
        });
        it('MarketsChangeOk', function (done) {
            this.timeout(10e3);
            
            apiws.on('/v1/markets', function(error, marketsSummary){
                assert(marketsSummary)
                done();
            })
            
            var param = {
                    amount:"10",
                    market:config.market
            }
            client.login().then(function(){
                return client.post('v1/spend', param)
            })
            .then(function(oid) {
            })
            .fail(done);

        });
    });
    describe('WebSocketSessionKey', function () {
        var apiws = new Airbex.WebSocketClient({
            url:config.url
        });
        before(function(done) {
            apiws.start().then(done, done);
        });
        it('LoginWithKeyKo', function (done) {
            var sessionKey = "asdfghjkl";
            apiws.loginWithSessionKey(sessionKey)
            .fail(function(error){
                assert(error);
                assert.equal(error.name, 'SessionNotFound');
                assert.equal(error.message, 'The specified session could not be found');
            })
            .then(done, done);
        });
        it('LoginKo', function (done) {
            var email = "idonotexist@mail.com";
            var password = "wowsuchpassword";
            
            apiws.login(email, password)
            .fail(function(error){
                assert(error);
                assert.equal(error.name, 'SessionNotFound');
                assert.equal(error.message, 'The specified session could not be found');
            })
            .then(done, done);
        });
        it('LoginOk', function (done) {
            var email = client.config.email;
            var password = client.config.password;
            
            apiws.login(email, password)
            .then(function(response){
                assert(response.user);
                assert(response.balances);
                assert(response.marketsInfo);
                assert(response.sessionKey);
                done()
            })
            .fail(done)
        });
    });
});
