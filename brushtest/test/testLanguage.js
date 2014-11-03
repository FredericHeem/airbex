/*global describe, it, before, after*/
var assert = require('assert');
var debug = require('debug')('testLanguage')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');
var request = require('request');

describe('Language', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
    var clientBob = testMngr.client("bob");
    var currency = 'btc';
    
    before(function(done) {
        testMngr.start().then(done).fail(done);
    });
    after(function(done) {
        testMngr.stop().then(done).fail(done);
    });
    
    describe('LanguagePublic', function () {
        it('LanguagePublicNoAcceptLanguage', function (done) {
            client.get('v1/language')
            .then(function(result){
                assert(result)
                //console.log(result)
                assert(!result.language)
                done()
            }).fail(done);
        });
        it('LanguagePublicAcceptLanguageEmpty', function (done) {
            request.get(config.url + 'v1/language', 
                    {headers:{'Accept-Language':''}}, function(err, res, body) {
                assert(!err)
                //console.log(body)
                assert(!body.language)
                done();
            })
        });
        it('LanguagePublicAcceptInvalid', function (done) {
            request.get(config.url + 'v1/language', 
                    {headers:{'Accept-Language':'aaaaaaaaaaaaaaaaaaaaa'}}, function(err, res, body) {
                assert(!err)
                assert(!body.language)
                done();
            })
        });
        it('LanguagePublicAcceptLanguageA', function (done) {
            request.get(config.url + 'v1/language', 
                    {headers:{'Accept-Language':'a'}}, function(err, res, body) {
                assert(!err)
                //console.log(body)
                done();
            })
        });
        
        it('LanguagePublicAcceptLanguageFr', function (done) {
            request.get(config.url + 'v1/language', 
                    {headers:{'Accept-Language':'fr'}}, function(err, res, body) {
                assert(!err)
                //console.log(body)
                done();
            })
        });
        it('LanguagePublicAcceptLanguageFr', function (done) {
            request.get(config.url + 'v1/language', 
                    {headers:{'Accept-Language':'fr,it-IT;q=0.8,it;q=0.6,en-US;q=0.4,en;q=0.2'}}, function(err, res, body) {
                assert(!err)
                //console.log(body)
                done();
            })
        });
    });
    
    describe('LanguageAuth', function () {
        before(function(done) {
            debug("before");
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
    });
   
});