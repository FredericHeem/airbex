/*global require*/
var debug = require('debug')('SnowDb');
var pg = require('pg');
var request = require('supertest');
var async = require('async');
var crypto = require('crypto');

module.exports = function (config) {
    var snowDb = {};
    snowDb.config = config;
    snowDb.pgClient = new pg.Client(config.pg_write_url);
    
    snowDb.getUserCount = function (done){
        debug("getUserCount");
        this.pgClient.query({
            text: 'SELECT COUNT(*) FROM "user"',
            values: []
        }, function(err, dres) {
            if (err) {
                done(null, err);
            } else if(!dres.rows.length){
                done(null, "getUserCount empty length");
            } else {
                var row = dres.rows[0];
                var count = row.count;
                debug("getUserCount: %s", count);
                done(count);
            }
        });
    };
    snowDb.getUserIdFromEmail = function (email, done){
        debug("getUserIdFromEmail email: %s", email);
        this.pgClient.query({
            text: 'SELECT user_id FROM "user" where email=$1',
            values: [email]
        }, function(err, dres) {
            if (err) {
                done(err);
            } else if(!dres.rows.length){
                done("getUserIdFromEmail: no user for such email");
            } else {
                var row = dres.rows[0];
                var user_id = row.user_id;
                debug("getUserIdFromEmail: %s", user_id);
                done(null, user_id);
            }
        });
    };   
   

    
    snowDb.queryUserEmailCode = function(email, done) {
        debug("queryUserEmailCode email:%s", email);
        this.pgClient.query({
            text: 'SELECT code from user_pending where email=$1',
            values: [email]
        }, function(err, dres) {
            if (err) {
                done(null, err);
            } else if(!dres.rows.length){
                done(null, "no email code found for email");
            } else {
                var row = dres.rows[0];
                var code = row.code;
                debug("email %s, code %s", email, code);
                done(code);
            }
        });
    };
    
    snowDb.queryUserPhoneCode = function(email, done) {
        debug("queryUserPhoneCode email:%s", email);
        this.pgClient.query({
            text: 'select phone_number_verify_code from "user" where email=$1',
            values: [email]
        }, function(err, dres) {
            if (err) {
                done(err);
            } else if(!dres.rows.length){
                done("no phone code found for email");
            } else {
                var row = dres.rows[0];
                var code = row.phone_number_verify_code;
                debug("email %s, phone code %s", email, code);
                done(null, code);
            }
        });
    };
    snowDb.deletePhoneNumber = function(email, done) {
        debug("deletePhoneNumber email:%s", email);
        this.pgClient.query({
            text: 'update "user" set phone_number=NULL,phone_number_verify_attempts=NULL where email=$1',
            values: [email]
        }, function(err) {
            done(err)
        });
    };
    snowDb.getPhoneNumber = function(email, done) {
        debug("getPhoneNumber email:%s", email);
        this.pgClient.query({
            text: 'select phone_number from "user" where email=$1',
            values: [email]
        }, function(err, dres) {
            if (err) {
                done(err);
            } else if(!dres.rows.length){
                done("no phone number found for email");
            } else {
                var row = dres.rows[0];
                var phone_number = row.phone_number;
                debug("email %s, phone code %s", email, phone_number);
                done(null, phone_number);
            }
        });
    };
    
    snowDb.userSetInfo = function(user, done) {
        debug("userSetInfo email:%s", user.email);
        if(user.admin){
            this.pgClient.query({
                text: 'UPDATE "user" SET admin=true where email=$1',
                values: [user.email]
            }, function(err, dres) {
                if(err) { 
                    done(err);
                } else {
                    done();
                }
            });
        } else {
            done();
        }
    };
 
    snowDb.getAccountId = function (user_id, currency, done){
        debug("getAccountId user_id: %s", user_id);
        this.pgClient.query({
            text: 'SELECT account_id FROM account WHERE user_id = $1 AND currency_id = $2',
            values: [user_id, currency]
        }, function(err, dres) {
            if (err) {
                done(err);
            } else if(!dres.rows.length){
                done("no account found");
            } else {
                var row = dres.rows[0];
                var account_id = row.account_id;
                debug("user_id %s, account_id %s", user_id, account_id);
                done(null, account_id);
            }
        });
    };
    
    snowDb.depositAddress = function (account_id, address, done){
        debug("depositCrypto account_id: %s, address: %s", account_id, address);
        this.pgClient.query({
            text: [
                'INSERT INTO btc_deposit_address (account_id, address)',
                'VALUES ($1, $2)'
            ].join('\n'),
            values: [account_id, address]
        }, function(err) {
            //if (err) return done(err)
            done()
        })
    };
    
    snowDb.creditBTC = function (user, amount, done){
        var address = user.config.btc_deposit_address;
        var hash = crypto.createHash('sha256')
        hash.update(crypto.randomBytes(8))
        var txid = hash.digest('hex')
        
        debug("creditCrypto amount: %s, address: %s, txid: %s", amount, address, txid);
        this.pgClient.query({
            text: [
                'SELECT btc_credit($1, $2, $3);'
            ].join('\n'),
            values: [txid, address, amount]
        }, function(err) {
            if (err) return done(err)
            done()
        })
    };
    
    snowDb.setDepositAddress = function(user, currency, done) {
        var email = user.email;
        debug("setDepositAddress email:%s", email);
        async.waterfall(
                [
                 function(callback) {
                     snowDb.getUserIdFromEmail(email, function(err, user_id) {
                         callback(err, user_id);
                     });
                 },
                 function(user_id, callback) {
                     snowDb.getAccountId(user_id, currency, function(err, account_id) {
                         callback(err, account_id);
                     });
                 },
                 function(account_id, callback) {
                     snowDb.depositAddress(account_id, user.btc_deposit_address, function(err) {
                         callback(err);
                     });
                 }
                 ],

                 function(err) {
                    debug("setDepositAddress done")
                    done(err);
                }
        );
   
    };    
    return snowDb;
};