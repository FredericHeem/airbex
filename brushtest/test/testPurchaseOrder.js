/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var config = require('./configTest.js')();
var num = require('num');
var debug = require('debug')('purchaseOrder')
var SnowBot = require('./snow-bot');
var SnowChef = require('./snow-chef');

describe('TestPurchaseOrder', function () {
	"use strict";
	var quote_currency = config.quote_currency;
	var admin_config = config.users[0];
	admin_config.url = config.url;
	var alice_config = config.users[1];
	var bob_config = config.users[2];
	alice_config.url = config.url; 
	bob_config.url = config.url; 
	var admin_client = new (require('../../client/index'))(admin_config);
	var client = new (require('../../client/index'))(alice_config);
	var client_bob = new (require('../../client/index'))(bob_config);
	var clients = [];
	clients.push(admin_client);
	clients.push(client);
	clients.push(client_bob);

	var snowBot = new SnowBot(config);
	var snowChef = new SnowChef(snowBot, config);

	before(function(done) {
		debug("before");
		this.timeout(5 * 1000);
		
        async.waterfall(
                [
                 function(callback) {
                     snowChef.securitySession(clients, callback)
                 },
                 function(callback) {
                     snowBot.db.pgClient.connect(callback);
                 }
                 ],

                 function(err) {
                    debug("init done")
                    done(err);
                }
        );
		
	});

	describe('PurchaseOrder', function () {
		describe('PurchaseOrder', function () {
			var poid_current;
			before(function(done) {
				var postData = {
						"market": config.market,
						"type": "bid",
						"amount": "1000.00",
						"address": config.btc_depsosit_address
				};

				client.purchaseOrderCreate(postData, function(err, poid) {
					assert(!err)
					assert(poid)
					poid_current = poid.id
					console.log("poid: ", poid)
					done()
				})                
			});   
			it('PurchaseOrderRead', function (done) {
				client.purchaseOrderRead(function(err, orders) {
					assert(!err)
					assert(orders)
					assert(orders.length > 0)
					console.log("orders: ", JSON.stringify(orders, null, 4))
					done()
				})         
			});
			
			it('PurchaseOrderCredit', function (done) {
				var po_id = poid_current;

				var bankCreditInfo = {
						"amount" : "1",
						"currency_id" : quote_currency,
						"reference" : "my first deposit for 1000",
						"purchase_order_id" : po_id
				}

				snowBot.createAndValidateBankCredit(admin_client, alice_config.email, bankCreditInfo, done)
			});     

			it('PurchaseOrdersRead', function (done) {
				admin_client.purchaseOrdersRead(function(err, orders) {
					assert(!err)
					assert(orders)
					assert(orders.length > 0)
					done()
				})         
			});
			
			it('PurchaseOrderUpdate', function (done) {
				var po_id = poid_current;
				var user_id = "1" ;
				var postData = {
						"user_id": user_id,
						"state": "PaymentReceived"
				};
				client.purchaseOrderUpdate(po_id, postData, function(err) {
					assert(!err)
					done()
				})         
			});

			it('PurchaseOrderCancelOk', function (done) {
				var poid = poid_current;
				client.purchaseOrderCancel(poid, function(err) {
					assert(!err)
					done()
				})         
			});            
		});
		describe('PurchaseOrderOther', function () {
			it('PurchaseOrderCreateOkRaw', function (done) {
				var cookie = "session=" + client.sessionKey;
				debug("cookie %s", cookie);

				var postData = {
						"market": config.market,
						"type": "bid",
						"amount": "1000.00",
						"address": config.btc_depsosit_address
				};

				request(config.url).post('v1/purchaseOrder/')
				.set('cookie', cookie)
				.send(postData).expect(201)
				.end(function(err, res) {
					assert(!err)
					console.log()
					done()
				});          
			});


			it('PurchaseOrderCancelKo', function (done) {
				var poid = "10000000";
				client.purchaseOrderCancel(poid, function(err) {
					assert(err)
					assert.equal(err.name, "PurchaseOrderNotFound")
					done()
				})         
			}); 
			it('PurchaseOrderMarketKO', function (done) {
				var postData = {
						"market": "BTCXXX",
						"type": "bid",
						"amount": "1000.00",
						"address": config.btc_depsosit_address
				};

				client.purchaseOrderCreate(postData, function(err, poid) {
					assert(err)
					assert(!poid)
					assert.equal(err.name, "InvalidMarket")
					done()
				})
			}); 
		});
	});
});