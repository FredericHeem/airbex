var util = require('util')
, num = require('num')
var debug = require('debug')('snow:crypto')

module.exports = exports = function(app, currencyId) {
    var prefix = '/v1/' + currencyId
    debug("registering ", currencyId)
    app.post(prefix + '/out', app.security.demand.otp(app.security.demand.withdraw(2), true),
        exports.withdraw.bind(exports, currencyId))
    app.get(prefix + '/address', app.security.demand.deposit(3), exports.address.bind(exports, currencyId))
}

exports.withdraw = function(currencyId, req, res, next) {
    debug('processing withdraw request of %d %s from user #%s to %s',
            req.body.amount, currencyId, req.user.id, req.body.address)
           
    if (!req.app.validate(req.body, 'v1/crypto_out', res)) {
        return
    }
    
    var currencyOption = req.app.cache.getCurrencyOption(currencyId);
    
    if(!currencyOption){
        return res.send(400, {
            name: 'InvalidCurrency',
            message: 'Invalid currency: ' + currencyId
        })   	
    }
    
    var address = req.body.address;
    var regEx = new RegExp(currencyOption.address_regex);
    if (!address.match(regEx)){
        return res.send(400, {
            name: 'InvalidAddress',
            message: 'Invalid Address ' + address + ", should match " + currencyOption.address_prefix
        })       
    }
    
    var amount = req.app.cache.parseCurrency(req.body.amount, currencyId)
    
    if (num(amount).lt(currencyOption.withdraw_min)) {
        return res.send(400, {
            name: 'AmountTooSmall',
            message: 'Minimum amount '
        })
    }

    var queryText = 'SELECT crypto_withdraw($1, $2, $3, $4) rid';

    req.app.conn.write.query({
        text: queryText,
        values: [
            currencyId.toUpperCase(),
            req.user.id,
            req.body.address,
            amount
        ]
    }, function(err, dr) {
        if (err) {
            console.log("withdraw error ", err.message);
            if (err.message.match(/non_negative_available/)) {
                return res.send(500, {
                    name: 'NoFunds',
                    message: 'insufficient funds'
                })
            }

            return next(err)
        }

        req.app.activity(req.user.id, 'Withdraw', {
            address: req.body.address,
            currency: currencyId,
            amount: req.body.amount
        })

        res.send(201, { id: dr.rows[0].rid })
    })
}

exports.address = function(currencyId, req, res, next) {
    var queryText = [
        'SELECT address',
        'FROM crypto_deposit_address',
        'WHERE account_id = user_currency_account($1, $2) AND currency_id = $2'
    ].join('\n');

    req.app.conn.read.query({
        text: queryText,
        values: [req.user.id, currencyId]
    }, function(err, dr) {
        if (err) return next(err)
        var address = dr.rows.length ? dr.rows[0].address : null
        res.send(200, { address: address })
    })
}
