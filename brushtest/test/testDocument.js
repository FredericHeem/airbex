/*global describe, it, before, after*/
var assert = require('assert');
var debug = require('debug')('testDocument')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('Document', function () {
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
    
    describe('UploadDoc', function () {
//        it('UploadDocInvalidFile', function (done) {
//            var file = '../data/a_style.abc';
//            client.uploadDocument(file).fail(function(err){
//                done();
//            });
//        });
        before(function(done) {
            testMngr.login().then(done).fail(done);
        });
        it('UploadDocOk', function (done) {
            var file = './data/a_style.jpg';
            client.uploadDocument(file).then(function(result){
                console.log("result: ", result)
                assert(result);
            }).then(done).fail(done);
        });
        it('AdminGetDocument', function (done) {
            var docNumber = 1;
            clientAdmin.adminDocumentView(docNumber)
            .then(function(document) {
                assert(document)
                //debug("AdminGetDocument: %s",  JSON.stringify(document, null, 4));
                done();
            })
            .fail(done);
        });
        it('AdminDocuments', function (done) {
            clientAdmin.adminDocuments()
            .then(function(documents) {
                debug("adminDocuments: %s",  JSON.stringify(documents, null, 4));
                done();
            })
            .fail(done);
        });
        it('AdminDocumentsUsers', function (done) {
            clientAdmin.adminDocumentsUsers()
            .then(function(documentsUsers) {
                assert(documentsUsers)
                debug("adminDocumentsUsers: %s",  JSON.stringify(documentsUsers, null, 4));
                done();
            })
            .fail(done);
        });

//        it('UploadDocTooBig', function (done) {
//            this.timeout(60*1000);
//            var file = '/Users/frederic/Downloads/bfg-1.11.0.jar';
//            snowBot.uploadDocument(client, file, function(err, res){
//                assert(res.statusCode == 400)
//                done();
//            })
//        });   

    });    
    

});