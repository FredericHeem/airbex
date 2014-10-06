/*global require*/
var debug = require('debug')('snowBot');
var request = require('supertest');
var async = require('async');
var SnowDb = require('./snow-db');
var assert = require('assert');
var num = require('num');
var Q = require('Q');

module.exports = function (config) {
    var snowBot = {};
    snowBot.config = config;
    snowBot.db = new SnowDb(config);
    
    snowBot.tradeUntillNoFunds = function(client, order, done) {
        debug("tradeUntillNoFunds email:%s", client.email);

        client.order(order)
        .then(function(res) {
            debug('Order bid #%s placed', res.id)
            setTimeout(snowBot.tradeUntillNoFunds(client, order, done), 100)
        })
        .fail(function(err){
            if(err.name == "InsufficientFunds"){
                done()
            } else {
                done(err)
            }
        })
    };
    
    snowBot.userCreate = function(email, key, done) {
        debug("userCreate email:%s, key: %s", email, key);
        var postData = {
            "email": email,
            "key": key
        };

        request(this.config.url).post('v1/users').send(postData).end(function(err, res) {
            if (err) {
                done(err);
            } else if (res.statusCode == 204) {
                done();
            } else if (res.statusCode == 400) {
                var response = res.body;
                debug("%s", response.name);
                if(response.name == "SmtpNotConfigured"){
                    done();
                } else {
                    done(response);
                }
                
            } else {
                done("UnknownError");
            }
        });
    };
    
    snowBot.uploadDocument = function(client, file_path, done) {
        var config = client.config
        debug("uploadDocument email:%s", config.email);
        var cookie = "session=" + client.sessionKey;
        
        request(config.url).post('v1/users/documents')
        .attach('document', file_path)
        .set('cookie', cookie)
        .end(function (err, res) {
            if(err){
               done(err, res)  
            } else if(res && res.statusCode != 200){
                done("bad error code", res);
            } else {
                done(null, res)
            }
        });
        
    };
    
    snowBot.userVerify = function(email, code, done) {
        debug("userVerify email:%s, code %s", email, code);
        request(this.config.url).post('v1/users/verify/' + code).send({}).expect(200).end(function(err, res) {
            if (err) {
                 done(err);
            } else {
                done();
            }
        });
    };
    
    snowBot.userCreateAndVerify = function(user, done) {
        var email = user.email;
        user.url = config.url;
        var client = new (require('../../client/index'))(user);
        var user_key = client.getUserKey(email, user.password)
        debug("userCreate email:%s, key: %s", email, user_key);
        var emailCode;
        
        async.series(
        [

        function(callback) {
            snowBot.userCreate(email, user_key, function(err){
                callback(err);
            });
        },

        function(callback) {
            snowBot.db.queryUserEmailCode(email, function(code, error){
                if(error){
                    callback(error);
                } else {
                    emailCode = code;
                    callback();
                }
                
            });
        },

        function(callback) {
            snowBot.userVerify(email, emailCode, callback);
        },
        
        function(callback) {
            snowBot.db.userSetInfo(user, callback);
        },
        
        ], function(err) {
            if (err) {
                debug("userCreateAndVerify Error: %s",err);
                done(err);
            } else {
                debug("userCreateAndVerify done");
                done();
            }
        });
    };
    
    snowBot.createAndValidateBankCredit = function(admin, email, bankCreditInfo, done) {
        debug("createAndValidateBankCredit for %s", email);
        async.waterfall([
        function(callback) {
            snowBot.db.getUserIdFromEmail(email).then(function(user) {
                bankCreditInfo.user_id = user.user_id;
                callback(null);
            }).fail(callback);
        },
        function(callback) {
            admin.bankCreditCreate(bankCreditInfo)
            .then(function(bankCreditResult) {
                debug("bankCreditCreate: ", JSON.stringify(bankCreditResult));
                var bankValidateInfo = {
                    "bank_credit_id": bankCreditResult.id
                };
                callback(null, bankValidateInfo);
            })
            .fail(callback)
        },
        function(bankValidateInfo, callback) {
        	debug("bankValidateInfo: ", JSON.stringify(bankValidateInfo));
            admin.bankCreditValidate(bankValidateInfo)
            .then(function(bankValidateResult) {
                debug("bankCreditValidate: %s", JSON.stringify(bankValidateResult))
                callback();
            }).fail(callback)
        }],

        function(err) {
            debug("createAndValidateBankCredit done")
            done(err);
        });
    }
    
    snowBot.startPhoneVerify = function(config, done){
        debug("startPhoneVerify %s", JSON.stringify(config));
        var postData = {
                "number": config.number,
                "country": config.country
        };
        
        request(this.config.url).post('v1/users/verify/text/').send(postData).expect(200).end(function(err, res) {
            if (err) {
                 done(err);
            } else {
                done();
            }
        });
    }
    snowBot.liabilityGetRoot = function(client, currency, done){
        debug("liabilityGetRoot ", currency);
        
        request(client.config.url).get('v1/proof/root/' + currency)
          .expect(200)
          .end(function(err, res) {
            if (err) {
                console.log("error ", err)
                 done(err);
            } else {
                done(null, res.body);
            }
        });
    }  
    
    snowBot.liabilityGetPartialTree = function(client, currency, done){
        debug("liabilityGetPartialTree ", currency);
        
        var cookie = "session=" + client.sessionKey;
        
        request(client.config.url).get('v1/proof/liability/' + currency)
          .set('cookie', cookie)
          .expect(200)
          .end(function(err, res) {
            if (err) {
                console.log("error ", err)
                 done(err);
            } else {
                //console.log("partialTree: ", JSON.stringify(res.body));
                done(null, res.body);
            }
        });
    }
    
    snowBot.liabilityGetAll = function(client, currency, done){
        debug("liabilityGetAll ");
        var response = {};
        async.parallel(
                [
                 function(callback) {
                     snowBot.liabilityGetRoot(client, currency, function(err, root){
                         response.root = root;
                         callback(err);
                     })
                 },
                 function(callback) {
                     snowBot.liabilityGetPartialTree(client, currency, function(err, partialTree){
                         response.partialTree = partialTree;
                         callback(err);
                     })
                 }
                 ],
                 function(err) {
                    done(err, response.root, response.partialTree);
                }
        );         
    } 
    
    snowBot.getAssets = function(client, currency, done){
        debug("getAssets ", currency);
        var response = {};
        request(client.config.url).get('v1/proof/asset/' + currency)
        .expect(200)
        .end(function(err, res) {
          if (err) {
              console.log("error ", err)
              done(err);
          } else {
              console.log("getAsset: ", JSON.stringify(res.body));
              done(null, res.body);
          }
      });  
    } 
    
    snowBot.getAssetsAll = function(client, done){
        debug("getAssetsAll ");
        var response = {};
        request(client.config.url).get('v1/proof/asset/')
        .expect(200)
        .end(function(err, res) {
          if (err) {
              console.log("error ", err)
              done(err);
          } else {
              console.log("getAssetsAll: ", JSON.stringify(res.body));
              done(null, res.body);
          }
      });  
    } 
    
    snowBot.uploadAsset = function(client, file_path, done) {
        var config = client.config
        debug("uploadAsset email:%s, url: %s", config.email, config.url);
        var postData = {
            
        };
        var cookie = "session=" + client.sessionKey;
        
        request(config.url).post('v1/proof/asset/')
        .attach('asset', file_path)
        .set('cookie', cookie)
        .end(function (err, res) {
            if(err){
               done(err, res)  
            } else if(res && res.statusCode != 200){
                done("bad error code", res);
            } else {
                done(null, res)
            }
        });
        
    };
    
    snowBot.setBalance = function(client, amount, currency, withdrawAddress){
        var balanceBefore;
        return client.balance(currency)
        .then(function(balance){
            console.log("setBalance B4: ", balance);
            balanceBefore = balance;
            var diff = num(amount).sub(num(balance.balance));
            if(diff.gt(num(0))){
                return snowBot.db.creditCrypto(client, currency, diff.toString())
            } else if(diff.lt(num(0))){
                var withdrawParam = {
                        currency:currency,
                        address:withdrawAddress,
                        amount:num(balance.balance).sub(amount).toString()
                };
                return snowBot.withdrawCryptoComplete(client, withdrawParam)
            }
            
        })
        
    }
    
    snowBot.depositComplete = function(client, amount, currency){
        var balanceBefore;
        return client.balance(currency)
        .then(function(balance){
            //console.log("depositComplete B4: ", balance);
            balanceBefore = balance;
            return snowBot.db.creditCrypto(client, currency, amount)
        })
        .then(function(){
            //console.log("depositComplete currency: ", currency);
            return client.balance(currency)
        })
        .then(function(balance){
            //console.log("depositComplete After ", balance);
            assert(num(balanceBefore.balance).add(num(amount)).eq(num(balance.balance)));
            assert(num(balanceBefore.hold).eq(num(balance.hold)));
            assert(num(balanceBefore.available).add(num(amount)).eq(num(balance.available)));
        })
    }
    snowBot.withdrawRequestCancel = function(client){
        var me = this;
        var deferred = Q.defer();
        client.get('v1/withdraws')
        .then(function(withdraws){
            assert(withdraws);
            console.log("#withdraws ", withdraws.length);
            async.forEach(withdraws, function(withdraw, callback) {
                console.log("#withdraws id ",  withdraw);
                if(withdraw.state === 'requested' || withdraw.state === 'sendingEmail'){
                    client.delete("v1/withdraws/" + withdraw.id).then(callback).fail(callback);
                } else {
                    callback();
                }
                
            }, function(err) {
                if(err) return deferred.reject(err);
                deferred.resolve();
            });
        })
        return deferred.promise;
    }
    snowBot.withdrawCryptoComplete = function(client, withdrawParam){
        var request_id;
        var currency = withdrawParam.currency;
        var balanceBefore;
        return client.balance(currency)
        .then(function(balance){
            //console.log("B4: ", balance);
            balanceBefore = balance;
            return client.withdrawCrypto(withdrawParam)
        })
        .then(function(result){
            //console.log("withdrawCrypto result: ", JSON.stringify(result));
            request_id = result.id;
            return client.balance(currency)
        })
        .then(function(balance){
            //console.log("After ", balance);
            assert(num(balanceBefore.balance).eq(num(balance.balance)));
            assert(num(balanceBefore.hold).add(num(withdrawParam.amount)).lt(num(balance.hold)));
            assert(num(balanceBefore.available).sub(num(withdrawParam.amount)).gt(num(balance.available)));
            return snowBot.db.getWithdrawRequest(request_id);
        })
        .then(function(result){
            //console.log("getWithdrawRequest result: ", JSON.stringify(result));
            assert.equal(result.method, currency)
            assert.equal(result.state, "sendingEmail")
            assert(result.code)
            assert(!result.completed_at)
            assert(result.hold_id)
            return client.post("v1/withdraw/verify/" + result.code);
        }).then(function(){
            return snowBot.db.getWithdrawRequest(request_id);
        })
        .then(function(result){
            //console.log("getWithdrawRequest result: ", JSON.stringify(result));
            assert.equal(result.state, "requested")
            assert(!result.completed_at)
            return snowBot.db.confirmWithdraw(request_id);
        }).then(function(){
            return snowBot.db.getWithdrawRequest(request_id);
        }).then(function(result){
            //console.log("getWithdrawRequest result: ", JSON.stringify(result));
            assert.equal(result.state, "completed")
            assert(result.completed_at)
            assert(!result.hold_id)
            return client.balance(currency)
        })
        .then(function(balance){
            //console.log("After confirm", balance);
            assert(num(balanceBefore.balance).sub(num(withdrawParam.amount)).gt(num(balance.balance)));
            assert(num(balanceBefore.hold).eq(num(balance.hold)));
            assert(num(balanceBefore.available).sub(num(withdrawParam.amount)).gt(num(balance.available)));
        })
    }
    return snowBot;
};