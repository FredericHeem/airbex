var debug = require('debug')('snow')
, assert = require('assert')
, request = require('request')
, num = require('num')
, async = require('async')
, Table = require('cli-table')
, sjcl = require('sjcl')
, debug = require('debug')('Client')

, Snow = module.exports = function(config) {
    this.url = config.url;
    this.config = config;
    this.apikey = config.apikey;
    debug('endpoint %s, url: %s, user key: ', config.email, this.url, this.user_key)
}

function sha256(s) {
    var bits = sjcl.hash.sha256.hash(s)
    return sjcl.codec.hex.fromBits(bits)
}

function bodyToError(body) {
    assert(body)
    debug("Error: %s", JSON.stringify(body))
    var error = new Error(body.message || body)
    if (body.name) error.name = body.name
    return error
}

function updateRequestWithKey(client, data){
    data.json = true;
    if(client.sessionKey){
        //debug("using session key %s", client.sessionKey)
        var jar = request.jar()
        var cookie = request.cookie("session=" + client.sessionKey)
        jar.add(cookie, client.url);
        data.jar = jar;
    } else if(client.apikey){
        //debug("using api key")
        data.qs = {"key": client.apikey};
    } else {
        debug("using no session key or api key found")
    }
    return data;
}

Snow.prototype.getUserKey = function(email, password) {
    return sha256(email.toLowerCase() + password);
}

Snow.prototype.keyFromCredentials = function(sid, email, password) {
    var ukey = this.getUserKey(email, password);
    var skey = sha256(sid + ukey)
    return skey
}

Snow.prototype.orders = function(cb) {
    var data = updateRequestWithKey(this, {});
    request(this.url + 'v1/orders', data, function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode !== 200) {
            debug('status code %s from orders', res.statusCode)
            debug(JSON.stringify(body))
            return cb(bodyToError(body))
        }
        cb(null, body)
    })
}

Snow.prototype.markets = function(cb) {
    request(this.url + 'v1/markets', {
        json: true
    }, function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode !== 200) return cb(bodyToError(body))
        cb(err, body)
    })
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

Snow.prototype.cancel = function(id, cb) {
    var data = updateRequestWithKey(this, {});
    data.method = 'DELETE';
    request(this.url + 'v1/orders/' + id, data , function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode === 404) return cb(new Error('Order ' + id + ' not found'))
        if (res.statusCode != 204) return cb(bodyToError(body))
        cb()
    })
}

Snow.prototype.cancelAll = function(cb) {
    var that = this

    this.orders(function(err, orders) {
        if (err) return cb(err)
        var maxOpsParallel = 128;
        async.forEachLimit(orders, maxOpsParallel, function(order, callback) {
            that.cancel(order.id, function(err) {
                if (err) throw err
                callback()
            });
        }, function(err) {
            cb(err);
        });  
    })
}

Snow.prototype.order = function(order, cb) {
    var data = updateRequestWithKey(this, {});
    data.json = order;
    data.method = "POST";
    request(this.url + 'v1/orders', data, function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode != 201) return cb(bodyToError(body))
        cb(null, body.id)
    })
}

Snow.prototype.whoami = function(cb) {
    var data = { };
    data = updateRequestWithKey(this, data);
    console.log(JSON.stringify(data));
    request(this.url + 'v1/whoami', data, function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode != 200) return cb(new Error('Status: ' + res.statusCode))
        debug("whoami res %s", body)
        cb(null, body)
    })
}

Snow.prototype.balances = function(cb) {
    var data = updateRequestWithKey(this, {});
    request(this.url + 'v1/balances', data , function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode != 200) return cb(bodyToError(body))
        cb(null, body)
    })
}

Snow.prototype.securitySession = function(cb) {
    var postData = {
        "email": this.config.email
    };
    var me = this;
    request(this.url + 'security/session', {
        json: postData,
        method: 'POST'
    }, function(err, res, body) {
        if (err) return cb(err)

        if (res.statusCode != 201) return cb(bodyToError(body))

        me.securitySessionId = body.id

        me.sessionKey = me.keyFromCredentials(me.securitySessionId, me.config.email, me.config.password)
        debug("sessionKey: %s, securitySession %s", me.sessionKey, me.securitySessionId);
        cb(null, me.securitySessionId)
    })
}

Snow.prototype.bankCredits = function(cb) {
    var data = { };
    data = updateRequestWithKey(this, data);
    request(this.url + 'admin/bankCredits', data , function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode != 200) return cb(bodyToError(body))
        cb(null, body)
    })
}

Snow.prototype.bankCreditCreate = function(bankCreditInfo, cb) {
    var data = { };
    data = updateRequestWithKey(this, data);
    data.method = "POST";
    bankCreditInfo.state = "review";
    data.json = bankCreditInfo;
    
    request(this.url + 'admin/bankCredits', data , function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode != 201) return cb(bodyToError(body))
        cb(null, body)
    })
}

Snow.prototype.bankCreditValidate = function(bankValidateInfo, cb) {
    var data = { };
    data = updateRequestWithKey(this, data);
    data.method = "POST";
    data.json = bankValidateInfo;
    
    request(this.url + 'admin/bankCredits/' + bankValidateInfo.bank_credit_id + '/approve', 
            data , function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode != 201) return cb(bodyToError(body))
        cb(null, body)
    })
}

Snow.prototype.bankCreditCancel = function(bankCancelInfo, cb) {
    var data = { };
    data = updateRequestWithKey(this, data);
    data.method = "POST";
    data.json = bankCancelInfo;
    
    request(this.url + 'admin/bankCredits/' + bankCancelInfo.bank_credit_id + '/cancel', 
            data , function(err, res, body) {
        if (err) return cb(err)
        if (res.statusCode != 204) return cb(bodyToError(body))
        cb(null, body)
    })
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
        head: ['Market', 'Bid', 'Ask', 'Last', 'High', 'Low', 'Volume'],
        colWidths: [8, 12, 12, 12, 12, 12, 12]
    })

    markets.forEach(function(market) {
        table.push([
            market.id,
            market.bid || '',
            market.ask || '',
            market.last || '',
            market.high || '',
            market.low || '',
            market.volume || '0'
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
