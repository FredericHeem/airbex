var debug = require('debug')('snow')
, assert = require('assert')
, fs = require('fs')
, request = require('request')
, num = require('num')
, async = require('async')
, Table = require('cli-table')
, sjcl = require('sjcl')
, debug = require('debug')('Client')
, Q = require("q")
, _ = require('lodash')
, Snow = module.exports = function(config) {
    this.url = config.url;
    this.config = config;
    this.apikey = config.key;
    debug('endpoint %s, url: %s, user key: %s, api key: %s', config.email, this.url, this.user_key, this.apikey)
}

function sha256(s) {
    var bits = sjcl.hash.sha256.hash(s)
    return sjcl.codec.hex.fromBits(bits)
}

function bodyToError(body) {
    assert(body)
    debug("bodyToError: %s", JSON.stringify(body))
    return body;
    //var error = new Error(body.message || body)
    //if (body.name) error.name = body.name
    //return error
}

function updateRequestWithKey(client, data){
    data.json = {};
    if(client.sessionKey){
        debug("using session key %s", client.sessionKey)
        var jar = request.jar()
        var cookie = request.cookie("session=" + client.sessionKey)
        jar.add(cookie, client.url);
        data.jar = jar;
    } else if(client.apikey){
        debug("using api key %s", client.apikey)
        data.qs = {"key": client.apikey};
    } else {
        debug("using no session key or api key found")
    }
    return data;
}

function onResult(err, res, body, deferred, statusCode){
    if (err) {
        debug("onResult err: ", err)
        return deferred.reject(err)
    }
    if (res.statusCode != statusCode){
        debug("onResult statusCode: %s != %s, body: %s", res.statusCode, statusCode, body)
        return deferred.reject(bodyToError(body))
    }
    deferred.resolve(body);
}

Snow.prototype.getUserKey = function(email, password) {
    return sha256(email.toLowerCase() + password);
}

Snow.prototype.keyFromCredentials = function(sid, email, password) {
    var ukey = this.getUserKey(email, password);
    var skey = sha256(sid + ukey)
    return skey
}

Snow.prototype.get = function(action, param) {
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    if(param){
        data.json = param;
    }
    request(this.url + action, data, function(err, res, body) {
        onResult(err, res, body, deferred, 200)
    })
    return deferred.promise;
}

Snow.prototype.post = function(action, param) {
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    if(param){
        data.json = param;
    }
    data.method = "POST";
    request(this.url + action, data, function(err, res, body) {
        onResult(err, res, body, deferred, 201)
    })
    return deferred.promise;
}

Snow.prototype.delete = function(action, param) {
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    if(param){
        data.json = param;
    }
    data.method = "DELETE";
    request(this.url + action, data, function(err, res, body) {
        onResult(err, res, body, deferred, 204)
    })
    return deferred.promise;
}

Snow.prototype.postRaw = function(action, sessionKey, param) {
    var me = this;
    var deferred = Q.defer();
    var uri = this.url + action
    var data = updateRequestWithKey(this, {uri:uri});
    if(param){
        data.json = param;
    }
    
    if(sessionKey){
        data.json.sessionKey = sessionKey;
    }

    console.log("postRaw action: %s, sessionKey %s, data: %s", 
            action, sessionKey, JSON.stringify(data.json))
    request.post(data , function(err, res, body){
        if (err) return deferred.reject(err)
        console.log(res.statusCode)
        deferred.resolve({res:res, body:body});
    })
    return deferred.promise;
}

Snow.prototype.postPasswordRequired = function(action, withdrawParam) {
    var me = this;
    var deferred = Q.defer();
    this.postRaw(action, null, withdrawParam)
    .then(function(result){
        var body = result.body;
        var res = result.res;
        console.log("body ", JSON.stringify(body))
        console.log("res.statusCode  ", res.statusCode )
        if (res.statusCode != 401) return deferred.reject(bodyToError(body))
        console.log("body.name ", body.name)
        assert.equal(body.name, "PasswordRequired")
        assert(body.token);
        var sessionKey = me.keyFromCredentials(body.token, me.config.email, me.config.password);
        console.log("sessionKey", sessionKey)
        return sessionKey;
    }).then(function(sessionKey){
        console.log("sessionKey", sessionKey)
        me.postRaw(action, sessionKey, withdrawParam)
        .then(function(param){
            if (param.res.statusCode != 201) return deferred.reject(bodyToError(param.body))
            deferred.resolve(param.body)
        })
        .fail(function(err){
            deferred.reject(err)
        });
        
    })
    .fail(function(err){
        deferred.reject(err)
    });
    
    return deferred.promise;
}

Snow.prototype.activities = function() {
    return this.get('v1/activities');
}

Snow.prototype.currencies = function() {
    return this.get('v1/currencies');
}

Snow.prototype.orders = function() {
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    request(this.url + 'v1/orders', data, function(err, res, body) {
        onResult(err, res, body, deferred, 200)
    })
    return deferred.promise;
}

Snow.prototype.markets = function() {
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    request(this.url + 'v1/markets', data, function(err, res, body) {
        onResult(err, res, body, deferred, 200)
    })
    return deferred.promise;
}

// Groups depth from array to bids and asks
Snow.prototype.depth = function(market, cb) {
    request(this.url + 'v1/markets/' + market + '/depth', {
        json: true
    }, function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode !== 200) return cb(bodyToError(body))
        cb(null, body)
    })
}

Snow.prototype.cancel = function(id) {
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    data.method = 'DELETE';
    request(this.url + 'v1/orders/' + id, data , function(err, res, body) {
        if (err) return deferred.reject(err)
        if (res.statusCode === 404) return deferred.reject({name:'OrderNotFound', message:'Order ' + id + ' not found'})
        if (res.statusCode != 204) return deferred.reject(bodyToError(body))
        deferred.resolve();
    })
    return deferred.promise;
}

Snow.prototype.cancelAll = function() {
    var that = this
    var deferred = Q.defer();
    this.orders().then(function(orders) {
        var maxOpsParallel = 128;
        async.forEachLimit(orders, maxOpsParallel, function(order, callback) {
            that.cancel(order.id).then(callback).fail(callback)
        }, function(err) {
            if(err) return deferred.reject(err);
            deferred.resolve();
        });  
    }).fail(function(err){
        deferred.reject(err)
    })
    return deferred.promise;
}

Snow.prototype.order = function(order) {
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    data.json = order;
    data.method = "POST";
    request(this.url + 'v1/orders', data, function(err, res, body) {
        onResult(err, res, body, deferred, 201)
    })
    return deferred.promise;
}

Snow.prototype.whoami = function() {
	console.log("whoami");
	var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    console.log("whoami %s", JSON.stringify(data));
    request(this.url + 'v1/whoami', data, function(err, res, body) {
        onResult(err, res, body, deferred, 200)
    })
    return deferred.promise;
}

Snow.prototype.balance = function(currency) {
    return this.balances().then(function(balances){
        var itemToFound;
        _.each(balances, function(item) {
            if(item.currency === currency){
                itemToFound = item;
                return;
            }
        })
        return itemToFound;
    })
}

Snow.prototype.balances = function() {
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    request(this.url + 'v1/balances', data , function(err, res, body) {
        onResult(err, res, body, deferred, 200)
    })
    return deferred.promise;
}

Snow.prototype.getDepositAddress = function(currency) {
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    request(this.url + 'v1/' + currency + '/address', data , function(err, res, body) {
        onResult(err, res, body, deferred, 200)
    })
    return deferred.promise;
}

Snow.prototype.securitySession = function() {
    var deferred = Q.defer();
    var postData = {
        "email": this.config.email
    };
    var me = this;
    request(this.url + 'security/session', {
        json: postData,
        method: 'POST'
    }, function(err, res, body) {
        if (err) return deferred.reject(err)
        if (res.statusCode != 201) return deferred.reject(bodyToError(body))

        me.securitySessionId = body.id
        me.sessionKey = me.keyFromCredentials(me.securitySessionId, me.config.email, me.config.password)
        //debug("securitySession sessionKey: %s, securitySession %s", me.sessionKey, me.securitySessionId);
        debug("securitySession email: ", me.config.email)
        deferred.resolve(me.securitySessionId);
    })
    return deferred.promise;
}

Snow.prototype.uploadDocument = function(file_path) {
    debug("uploadDocument file_path", file_path);
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    data.json = true;
    var req = request.post(this.url + 'v1/users/documents', data , function(err, res, body) {
        onResult(err, res, body, deferred, 200);
    });
    
    var form = req.form();
    try {
        form.append("document", fs.createReadStream(file_path));
    } catch(e){
        deferred.reject(e);
    }
            
    return deferred.promise;
}

Snow.prototype.adminDocumentView = function(doc_id) {
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    request(this.url + 'admin/users/documents/' + doc_id + '/view', data , function(err, res, body) {
        onResult(err, res, body, deferred, 200)
    });
    return deferred.promise;
}

Snow.prototype.adminDocuments = function(cb) {
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    request(this.url + 'admin/documents', data , function(err, res, body) {
        onResult(err, res, body, deferred, 200)
    })
    return deferred.promise;
}

Snow.prototype.adminDocumentsUsers = function(cb) {
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    request(this.url + 'admin/documents/users', data , function(err, res, body) {
        onResult(err, res, body, deferred, 200)
    })
    return deferred.promise;
}

Snow.prototype.bankCredits = function(cb) {
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    request(this.url + 'admin/bankCredits', data , function(err, res, body) {
        onResult(err, res, body, deferred, 200)
    })
    return deferred.promise;
}

Snow.prototype.bankCreditCreate = function(bankCreditInfo, cb) {
    var deferred = Q.defer();
    var data = updateRequestWithKey(this, {});
    data.method = "POST";
    bankCreditInfo.state = "review";
    data.json = bankCreditInfo;
    console.log("bankCreditCreate ", JSON.stringify(data))
    request(this.url + 'admin/bankCredits', data , function(err, res, body) {
        onResult(err, res, body, deferred, 201)
    })
    return deferred.promise;
}

Snow.prototype.bankCreditValidate = function(bankValidateInfo, cb) {
    var deferred = Q.defer();
    data = updateRequestWithKey(this, {});
    data.method = "POST";
    data.json = bankValidateInfo;
    
    request(this.url + 'admin/bankCredits/' + bankValidateInfo.bank_credit_id + '/approve', 
            data , function(err, res, body) {
        onResult(err, res, body, deferred, 201)
    })
    return deferred.promise;
}

Snow.prototype.bankCreditCancel = function(bankCancelInfo, cb) {
    var deferred = Q.defer();
    data = updateRequestWithKey(this, {});
    data.method = "POST";
    data.json = bankCancelInfo;
    
    request(this.url + 'admin/bankCredits/' + bankCancelInfo.bank_credit_id + '/cancel', 
            data , function(err, res, body) {
        onResult(err, res, body, deferred, 204)
    })
    return deferred.promise;
}


Snow.prototype.withdrawCryptoRaw = function(sessionKey, withdrawParam) {
    var action = 'v1/' + withdrawParam.currency + '/out';
    return this.postRaw(action, sessionKey, withdrawParam);
}

Snow.prototype.withdrawCrypto = function(withdrawParam) {
    var action = 'v1/' + withdrawParam.currency + '/out';
    return this.postPasswordRequired(action, withdrawParam)
}

// I'll need to look at how this is done. I belive you post to
// security/session with your email and receive a token. You then
// hash that token with your email and password to retrieve the session
// secret.
//
// I suggest that running login overrides the use of this.apikey for queries.
// Snow.prototype.login = function(username, password, cb) {
// }

Snow.prototype.createTableUser = function(user){
	var table = new Table({
        head: ['Id', 'Email', 'Security Level', 'twoFactor', 'First name', 'Last name', 'Phone', 'Email verified'],
        colWidths: [4, 24, 14, 12, 16, 16, 16, 16]
    })

    table.push([
        user.id,
        user.email || '',
        user.securityLevel || '',
        user.twoFactor ? 'Yes' : 'No',
        user.firstName || '',
        user.lastName || '',
        user.phone || '',
        user.emailVerified ? 'Yes' : 'No'
    ])

    return table
}

Snow.prototype.createTableBalances = function(balances){
	var table = new Table({
        head: ['Currency', 'Balance', 'Hold', 'Available'],
        colWidths: [12, 12, 12, 12]
    })

	balances.forEach(function(balance) {
        table.push([
            balance.currency,
            balance.balance,
            balance.hold,
            balance.available
        ]);
    });

    return table;
};


Snow.prototype.getBalanceForCurrency = function(balances, currency){
    var balance;
    balances.every(function(balanceEl) {
        if(balanceEl.currency == currency){
            balance = balanceEl;
            return false;
        } else {
            return true;     
        }
    });
    return balance;
};

Snow.prototype.createTableMarkets = function(markets){
	var table = new Table({
        head: ['Market', 'Bid', 'Ask', 'Last', 'High', 'Low', 'Volume', 'fee_bid_taker', 'fee_bid_maker', 'fee_ask_taker', 'fee_ask_maker'],
        colWidths: [8, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]
    })
    markets.forEach(function(market) {
    	console.log(JSON.stringify(market));
        table.push([
            market.id,
            market.bid || '',
            market.ask || '',
            market.last || '',
            market.high || '',
            market.low || '',
            market.volume || '0',
            market.fee_bid_taker || '',
            market.fee_bid_maker || '',
            market.fee_ask_taker || '',
            market.fee_ask_maker || ''
        ])
    })
    return table
}

Snow.prototype.createTableOrders = function(orders){
	var table = new Table({
        head: ['#', 'Market', 'Type', 'Volume', 'Price', 'Total'],
        colWidths: [8, 10, 6, 20, 20, 20]
    })

    orders.forEach(function(order) {
        var pair = [order.market.substr(0, 3), order.market.substr(3)]
        table.push([
            order.id,
            order.market,
            order.type.toUpperCase(),
            order.remaining + ' ' + pair[0],
            order.price + ' ' + pair[1],
            num(order.remaining).mul(order.price) + ' ' + pair[1]
        ])
    })
    return table
}
Snow.prototype.createTableDepth = function(depth){
    // TODO
    return JSON.stringify(depth);
}

Snow.prototype.purchaseOrderRead = function(cb) {
    var data = { };
    data = updateRequestWithKey(this, data);
    data.method = "GET";
    request(this.url + 'v1/purchaseOrder/', data , function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode != 200) return cb(bodyToError(body))
        cb(null, body)
    })
}

Snow.prototype.purchaseOrderCreate = function(purchaseOrderData, cb) {
    var data = { };
    data = updateRequestWithKey(this, data);
    data.method = "POST";
    data.json = purchaseOrderData;
    request(this.url + 'v1/purchaseOrder/', data , function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode != 201) return cb(bodyToError(body))
        cb(null, body)
    })
}

Snow.prototype.purchaseOrdersRead = function(cb) {
    var data = { };
    data = updateRequestWithKey(this, data);
    data.method = "GET";
    request(this.url + 'v1/admin/purchaseOrder/',data , function(err, res, body) {
        console.log(err);
        console.log(res.statusCode);
        if (err) return cb(err)
        if (res.statusCode != 200) return cb(bodyToError(body))
        cb(null, body)
    })
}

Snow.prototype.purchaseOrderUpdate = function(po_id, po_data, cb) {
    var data = { };
    data = updateRequestWithKey(this, data);
    data.method = "POST";
    data.json = po_data;
    request(this.url + 'v1/admin/purchaseOrder/' + po_id, data , function(err, res, body) {
        console.log(err);
        console.log(res.statusCode);
        if (err) return cb(err)
        if (res.statusCode === 404) return cb(res.body)
        if (res.statusCode != 201) return cb(bodyToError(body))
        cb(null, body)
    })
}

Snow.prototype.purchaseOrderCancel = function(purchaseOrderId, cb) {
    var data = { };
    data = updateRequestWithKey(this, data);
    data.method = "DELETE";
    request(this.url + 'v1/purchaseOrder/' + purchaseOrderId , data, function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode === 404) return cb(res.body)
        if (res.statusCode != 204) return cb(new Error('http error ' + res.statusCode))
        cb(null)
    })
}