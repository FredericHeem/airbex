/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var debug = require('debug')('testAdminOrders')
var config = require('./configTest.js')();
var TestMngr = require('./TestMngr');

describe('AdminOrders', function () {
    "use strict";
    
    var testMngr = new TestMngr(config);
    var snowBot = testMngr.bot();
    var snowChef = testMngr.chef();
    var clientAdmin = testMngr.client("admin");
    var client = testMngr.client("alice");
    var clientConfig = testMngr.clientConfig("alice");
   
    before(function(done) {
        testMngr.start().then(testMngr.login).then(done).fail(done);
    });
    after(function(done) {
        testMngr.stop().then(done).fail(done);
    });
    describe('AdminOrderNotAuthenticated', function () {
        it('AdminOrdersNotAuthenticated', function (done) {
            client.get('admin/orders')
            .fail(function(error){
                assert(error)
                assert.equal(error.name, 'UserNotAdmin');
                done();  
            })
            .fail(done)
        });
    });
    
    describe('AdminOrdersAuthenticated', function () {
        before(function(done) {
            this.timeout(5 * 1000);
            testMngr.login().then(done).fail(done);
        });
        it('AdminOrdersGet', function (done) {
            clientAdmin.get('admin/orders?remaining=true')
            .then(function(orders){
                assert(orders);
                //console.log(orders);
                done()
            })
        });
        
    });
});