var num = require('num')
, async = require('async')
, log = require('../log')(__filename)
, debug = log.debug
, _ = require('lodash')
, EventEmitter = require('events').EventEmitter
, util = require('util')
, lproof = require('lproof')

var CryptoLiability = module.exports = function(ep, db) {
    _.bindAll(this)
    var that = this
    , Bitcoin = require('bitcoin').Client
    this.bitcoin = new Bitcoin(ep)
    this.minConf = ep.minConf || 3
    this.db = db
    this.currency = ep.currency
    this.scale = ep.scale || 8
    this.currencyLC = this.currency.toLowerCase();
    
    async.forever(function(cb) {
        that.check(function(err) {
            if (err) {
                console.error(err)
                that.emit(err)
            }
            setTimeout(cb, 30e3)
        })
    })
}

util.inherits(CryptoLiability, EventEmitter)

CryptoLiability.prototype.createCompleteTree = function(accounts) {
    debug("createCompleteTree #accounts %d", accounts.length)
    var completeTree = lproof.generateCompleteTree(accounts);
    //debug(completeTree.serializeToArray());
    return completeTree;
}

CryptoLiability.prototype.getTotalsFromDb = function(cb) {
    debug("getTotalsFromDb ");
    var me = this;
    
    var query = {
            text: [
                   'SELECT SUM(balance) FROM account WHERE currency_id=$1 AND type=\'current\' UNION ALL ',
                   'SELECT COUNT(*) FROM account WHERE currency_id=$1 AND type=\'current\' UNION ALL',
                   '(SELECT balance from liability WHERE currency=$1 ORDER BY created_at desc limit 1) UNION ALL',
                   '(SELECT users from liability WHERE currency=$1 ORDER BY created_at desc limit 1)'
            ].join('\n'),
            values: [me.currency]
    }

    this.db.query(query, function(err, dr) {
        if (err) {
            log.error("getTotalsFromDb Error %s", err)
            return cb(err)
        }
        if (dr.rowCount < 2) {
            log.error("getTotalsFromDb cannot get balances, rowCount: ", dr.rowCount)
            return cb("Missing Db Info")
        }
        var balance = dr.rows[0].sum;
        var users = dr.rows[1].sum;
        var balanceLiability = 0;
        var usersLiability = 0;
        if (dr.rowCount == 4){
            var balanceLiability = dr.rows[2].sum;
            var usersLiability = dr.rows[3].sum;
        }

        debug("getTotalsFromDb balance %s/%s, #users %s/%s", balance, balanceLiability, users, usersLiability);
        var result = {
                balance: balance,
                users: users,
                balanceLiability: balanceLiability,
                usersLiability: usersLiability
        }
        cb(null, result)
    })
}

CryptoLiability.prototype.saveCompleteTreeToDb = function(completeTree, result, cb) {
    debug("saveCompleteTreeToDb ");
    var me = this;
    var completeTreeSerialized = completeTree.serializeToArray()
    debug(completeTreeSerialized);
    
    var query = {
            text: [
                   'INSERT INTO liability (currency, balance, users, tree) VALUES($1,$2,$3,$4)'
            ].join('\n'),
            values: [me.currency, result.balance, result.users, completeTreeSerialized]
    }

    this.db.query(query, function(err) {
        if (err) {
            debug("saveCompleteTreeToDb Error %s", err)
            return cb(err)
        }
        debug("saveCompleteTreeToDb saved");
        cb()
    })
}

CryptoLiability.prototype.createAccountsJson = function(cb) {
    debug("createAccountsJson");
    var me = this;
    var query = {
            text: [
                   'SELECT u.email, ac.balance', 
                   'FROM "account" ac', 
                   'INNER JOIN "user" u ON ac.user_id = u.user_id', 
                   'WHERE currency_id=$1 AND type=\'current\''
            ].join('\n'),
            values: [me.currency]
    }

    this.db.query(query, function(err, dr) {
        if (err) {
            debug("Error %s", err)
            return cb(err)
        }
        debug("#users ", dr.rowCount)
        if (!dr.rowCount) {
            debug("no users")
            return cb(null, null)
        }
        var accounts = [];
        dr.rows.map(function(row) {
            debug("email %s, balance: %s", row.email, row.balance);
            accounts.push( {
                user: row.email,
                balance: row.balance / 1e8
            })
        })
        debug("#accounts ", accounts.length)
        cb(null, accounts)
    })
}

CryptoLiability.prototype.createAndSaveRoot = function(result, cb) {
    debug("createAndSaveRoot");
    var me = this;
    async.waterfall(
            [
             function(callback) {
                 me.createAccountsJson(callback);
             },
             function(accounts, callback) {
                 if(accounts){
                     var completeTree = me.createCompleteTree(accounts);
                     me.saveCompleteTreeToDb(completeTree, result, callback);
                 } else {
                     callback()
                 }
             }
             ],
             function(err) {
                debug("createAndSaveRoot done")
                cb(err);
            }
    );
}

CryptoLiability.prototype.check = function(cb) {
    var me = this;
    async.waterfall(
            [
             function(callback) {
                 me.getTotalsFromDb(callback)
             },
             function(result, callback) {
                 if((result.balance != result.balanceLiability) || (result.users != result.usersLiability)){
                     me.createAndSaveRoot(result, callback)
                 } else {
                     callback();
                 }
             }
             ],
             function(err) {
                debug("check done")
                cb(err);
            }
    );
}

