/*global describe, it, before, after*/
var _ = require("underscore")
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var config = require('./configTest.js')();
var debug = require('debug')('testBitstamp');


describe('Users', function () {
    "use strict";
    var timeout = 1000 * 60;
    
    var Bitstamp = require('bitstamp');

    var publicBitstamp = new Bitstamp();
    
    before(function(done) {
        done()
    });
    
    describe('OrderBookBitstamp', function () {
        this.timeout(timeout);
        it('OrderBookBitstampOk', function (done) {
            this.timeout(10000);
           debug("getting order book")
           publicBitstamp.order_book(true, function(err, orderBook){
               debug("ordeBook ", JSON.stringify(orderBook, null, 4));
               done()
           });
        });
    });
});
