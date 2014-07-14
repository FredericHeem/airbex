/*global describe, it, before, after*/
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var config = require('./configTest.js')();
var num = require('num');
var debug = require('debug')('withdraw')
var SnowBot = require('./snow-bot');
var SnowChef = require('./snow-chef');

describe('TestPasswordRequired', function () {
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

    describe('TestWithdrawCrypto', function () {
        it('TestWithdrawCryptoBTCOk', function (done) {
            var withdrawParam = {
                    currency:'BTC',
                    address:alice_config.btc_deposit_address,
                    amount:'10000000'
            };
            client.withdrawCrypto(withdrawParam, function(err) {
                assert(!err || err.name === "NoFunds")
                done()
            })
        });
    });
});