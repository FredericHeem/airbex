var num = require('num')
, async = require('async')
, debug = require('debug')('snow:cryptoasset')
, _ = require('lodash')
, EventEmitter = require('events').EventEmitter
, util = require('util')

var CryptoAsset = module.exports = function(ep, db) {
    _.bindAll(this)
    var that = this
    , Bitcoin = require('bitcoin').Client
    this.bitcoin = new Bitcoin(ep)
    this.minConf = ep.minConf || 3
    this.db = db
    this.currency = ep.currency
    this.scale = ep.scale || 8
    this.currencyLC = this.currency.toLowerCase();
    this.messageToSign = "";
    this.signaturesOriginal = {}
    this.signaturesToAdd = []
    
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

util.inherits(CryptoAsset, EventEmitter)

CryptoAsset.prototype.getListReceivedByAddress = function(cb) {
    this.bitcoin.cmd('listunspent', 1, function (err, res){
        var addressesDup = {}
        var addresses = [];
        if (err) return cb(err);

        if (!res.length) {
          return cb('No address found in bitcoin wallet!');
        }
        res.forEach(function (hash) {
          debug("listunspent: ", hash.address)
          if(!addressesDup[hash.address]){
            addressesDup[hash.address] = hash.address;
            addresses.push(hash.address);
          }
        });
        debug("listunspent: #addr %s", addresses.length)
        cb(null, addresses);
      });
}


CryptoAsset.prototype.getAssetsFromDb = function(cb) {
    var query = {
            text: 'SELECT asset_id, blockhash, message FROM asset WHERE currency=$1 ORDER BY created_at desc limit 1', 
            values:[this.currency]
    }
    var me = this;
    this.db.query(query, function(err, dr) {
        if (err) return cb(err)
        var signatures = {};
        if(dr.rows.length){
        	var row = dr.rows[0]
        	debug(JSON.stringify(row));
        	me.asset_id = row.asset_id;
        	me.messageToSign = row.blockhash + '|' + row.message;
        	debug(me.messageToSign);
        	me.getSignaturesFromDb(me.asset_id, cb)
        } else {
        	debug("no asset")
        	cb(null)
        }
        
    })
}

CryptoAsset.prototype.getSignaturesFromDb = function(asset_id, cb) {
	debug("getSignaturesFromDb id: %s", asset_id)
    var query = {
            text: "SELECT address, signature FROM signatures WHERE asset_id=$1", 
            values:[asset_id]
    }
    var me = this;
	me.signaturesOriginal = {}
    this.db.query(query, function(err, dr) {
        if (err) return cb(err)
        
        dr.rows.map(function(row) {
        	debug("%s => %s", row.address, row.signature)
        	me.signaturesOriginal[row.address] = row.signature;
        })
        
        cb(null)
    })
}

CryptoAsset.prototype.updateSignaturesToDb = function(address, signature, cb) {
	if(!this.asset_id) return cb("no asset")
	debug("updateSignaturesToDb id %s, address: %s, signature: %s", this.asset_id, address, signature)
    var query = {
            text: 'INSERT INTO signatures(asset_id, address, signature, wallet) VALUES($1, $2, $3, $4)', 
            values:[this.asset_id, address, signature, "hot"]
    }
    
    this.db.query(query, function(err, dr) {
        if (err) return cb(err)
        debug("signatures updated")
        cb(null)
    })  
}

CryptoAsset.prototype.signAddresses = function(addresses, cb) {
	console.log(JSON.stringify(addresses))
    var me = this;
	me.signaturesToAdd = [];
    async.each(addresses, function (addr, done) {
    	debug("processing addr: %s, msg: %s", addr, me.messageToSign)
    	if(!me.signaturesOriginal[addr]){
    		me.bitcoin.cmd('signmessage', addr, me.messageToSign, function (err, res) {
    			if (err) return cb(err);
    			debug("signature ", res)
    			me.signaturesToAdd.push({
    				address: addr,
    				signature: res,
    				type: "hot"
    			});
    			me.updateSignaturesToDb(addr, res, done)
    		});
    	} else {
    		debug("address already exist")
    		done()
    	}
    }, cb);
}

CryptoAsset.prototype.check = function(cb) {
	var me = this
    async.parallel([
        function(cb){ me.getListReceivedByAddress(cb)},
        function(cb){ me.getAssetsFromDb(cb)}
        ]
    , function(err, res) {
        if (err) return cb(err)
        //console.log(JSON.stringify(res))
        var addresses = res[0]
        var signatures = res[1]
        me.signAddresses(addresses, cb);
    })
}

