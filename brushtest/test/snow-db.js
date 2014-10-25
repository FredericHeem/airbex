/*global require*/
var debug = require('debug')('SnowDb');
var pg = require('pg');
var assert = require('assert');
var request = require('supertest');
var async = require('async');
var crypto = require('crypto');
var Q = require("q");
var num = require('num');

module.exports = function (config) {
    var snowDb = {};
    snowDb.config = config;
    snowDb.pgClient = new pg.Client(config.pg_write_url);
    
    snowDb.getUserCount = function (){
        return snowDb.query({
            text:[
                  'SELECT COUNT(*) FROM "user"'
                  ].join('\n'),
                  values: []
        })
    };
    snowDb.getUserIdFromEmail = function (email){
        return snowDb.query({
            text:[
                  "SELECT user_id",
                  'FROM "user"',
                  "WHERE email=$1"
                  ].join('\n'),
                  values: [email]
        })
    };
   
    snowDb.restoreResetPassword = function (email){
        return snowDb.queryNoResult({
            text:[
                  'UPDATE "user"',
                  'set reset_email_code=NULL, reset_started_at=NULL, reset_phone_code=NULL',
                  "WHERE email=$1"
                  ].join('\n'),
                  values: [email]
        })
    };
    
    snowDb.confirmWithdraw = function (request_id){
        return snowDb.queryNoResult({
            text:[
                  'SELECT confirm_withdraw($1)'
                  ].join('\n'),
                  values: [request_id]
        })
    };
    
    snowDb.getWithdrawEmailCode = function (email, currency){
        return snowDb.getAccountIdFromEmail(email, currency)
        .then(function(result){
            //console.log("account_id", result.account_id)
            return snowDb.query({
                text:[
                      "SELECT code",
                      "FROM withdraw_request",
                      "WHERE method = $1 AND account_id = $2 AND state = 'sendingEmail'",
                      "ORDER BY request_id DESC LIMIT 1"
                      ].join('\n'),
                values: [currency, result.account_id]
            })
        })
    }
    
    snowDb.getAccountIdFromEmail = function (email, currency){
        return snowDb.query({
            text:[
                  "SELECT a.account_id",
                  "FROM account a",
                  "JOIN \"user\" u ON a.user_id = u.user_id",
                  "WHERE u.email = $1 AND a.currency_id=$2"
                  ].join('\n'),
                  values: [email, currency]
        })
    }
    
    snowDb.getWithdrawRequest = function (request_id){
        return snowDb.query({
            text:[
                  "SELECT *",
                  "FROM withdraw_request",
                  "WHERE request_id = $1"
                  ].join('\n'),
                  values: [request_id]
        })
    }
    
    snowDb.queryNoResult = function(query){
        var deferred = Q.defer();
        //console.log("queryNoResult: %s", JSON.stringify(query));
        this.pgClient.query(query, function(err, dres) {
            if (err) {
                console.error("query error: ", err)
                deferred.reject(err);
            }  else {
                deferred.resolve();
            }
        });
        
        return deferred.promise;
    }
    
    snowDb.query = function(query){
        var deferred = Q.defer();
        //console.log("query: %s", JSON.stringify(query));
        this.pgClient.query(query, function(err, dres) {
            if (err) {
                //console.error("query error: ", err)
                deferred.reject(err);
            } else if(!dres.rows.length){
                //console.error("NoResult")
                deferred.reject({name:"NoResult"})
            } else {
                var row = dres.rows[0];
                //console.log("query result: %s", row);
                deferred.resolve(row);
            }
        });
        
        return deferred.promise;
    }
    
    snowDb.getResetPasswordCode = function (email){
        var deferred = Q.defer();
        debug("getResetPasswordCode email: %s", email);
        this.pgClient.query({
            text: 'SELECT reset_email_code FROM "user" where email=$1',
            values: [email]
        }, function(err, dres) {
            if (err) {
                deferred.reject(err);
            } else if(!dres.rows.length){
                deferred.reject({name:"NoSuchUser"})
            } else {
                var row = dres.rows[0];
                var reset_email_code = row.reset_email_code;
                debug("getResetPasswordCode: %s", reset_email_code);
                deferred.resolve({reset_email_code:reset_email_code});
            }
        });
        
        return deferred.promise;
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
    
    snowDb.creditCrypto = function (client, currency, amount){
        var me = this;
        var deferred = Q.defer();
        var hash = crypto.createHash('sha256')
        hash.update(crypto.randomBytes(8))
        var txid = hash.digest('hex')
        //console.log("creditCrypto currency %s, amount: %s, txid: %s", currency, amount, txid);
        var amountSat = num(amount).mul(Math.pow(10, 8)).set_precision(0).toString();
        client.getDepositAddress(currency)
        .then(function(result){
            assert(result.address);
            var address = result.address;
            //console.log("creditCrypto amount: %s, address: %s, txid: %s", amountSat, address, txid);
            me.pgClient.query({
                text: [
                    'SELECT crypto_credit($1, $2, $3, $4);'
                ].join('\n'),
                values: [currency, txid, address, amountSat]
            }, function(err) {
                if (err) return deferred.reject(err)
                deferred.resolve();
            })
        }).fail(deferred.reject)

        return deferred.promise;
    };
    
    snowDb.setDepositAddress = function(user, currency, done) {
        var email = user.email;
        //debug("setDepositAddress email:%s", email);
        async.waterfall(
                [
                 function(callback) {
                     snowDb.getUserIdFromEmail(email).then(function(user_id) {
                         callback(null, user_id);
                     }).fail(callback);
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