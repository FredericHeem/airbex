var util = require('util')
, num = require('num')
, crypto = require('crypto')
, log = require('../log')(__filename)
, debug = log.debug
, bitcore = require('bitcore')
, Address = bitcore.Address;

module.exports = exports = function(app, currencyId) {
    var prefix = '/v1/' + currencyId
    app.post(prefix + '/out', app.security.demand.otp(app.security.demand.withdraw(2), true),
        exports.withdraw.bind(exports, currencyId))
    app.get(prefix + '/address', app.security.demand.any, exports.address.bind(exports, currencyId))
    app.post('/v1/withdraw/verify/:code([a-f0-9]{20})', exports.withdrawVerifyCode)
}

exports.code = function() {
    return crypto.randomBytes(10).toString('hex')
}

exports.withdrawVerifyCode = function(req, res, next) {
    debug('withdrawVerifyCode code: %s', req.params.code);
    req.app.conn.write.get().query({
        text: 'SELECT withdraw_verify_code($1)',
        values: [req.params.code]
    }, function(err, dr) {
        if (err) {
            log.error("withdrawVerifyCode ", err.message);
            if (err.message == 'Unknown email verification code') {
                return res.status(409).send({
                    name: 'UnknownEmailVerifyCode',
                    message: 'The code is already verified or the code has been expired'
                })
            }
            return next(err)
        }
        
        res.status(204).end()
    })
}

exports.withdraw = function(currencyId, req, res, next) {
    log.info('withdraw request of %d %s from user #%s to %s',
            req.body.amount, currencyId, req.user.id, req.body.address)

    if (!req.app.validate(req.body, 'v1/crypto_out', res)) {
        return
    }

    var currencyOption = req.app.cache.getCurrencyOption(currencyId);
    
    if(!currencyOption){
        return res.status(400).send({
            name: 'InvalidCurrency',
            message: 'Invalid currency: ' + currencyId
        })   	
    }
    
    var address = req.body.address;
    
    var a = new Address(address, 'base58', currencyId.toLowerCase());
    if(!a.isValid()){
        return res.status(400).send({
            name: 'InvalidAddress',
            message: 'Invalid Address ' + address + " is not valid"
        });
    }
    
    var withdraw_min = req.app.cache.currencies[currencyId].withdraw_min;
    var withdraw_max = req.app.cache.currencies[currencyId].withdraw_max;
    
    var amount = req.app.cache.parseCurrency(req.body.amount, currencyId)
    
    if (num(amount).lt(withdraw_min)) {
        return res.status(400).send({
            name: 'AmountTooSmall',
            message: 'Minimum amount is ' + req.app.cache.formatCurrency(withdraw_min, currencyId) + ' '  + currencyId
        })
    }
    
    if (num(amount).gt(withdraw_max)) {
        return res.status(400).send({
            name: 'AmountTooHigh',
            message: 'Maximum amount is ' + req.app.cache.formatCurrency(withdraw_max, currencyId) + ' '  + currencyId
        })
    }
    
    var code = exports.code()
    debug("withdraw code ", code)
    var queryText = 'SELECT crypto_withdraw($1, $2, $3, $4, $5) rid';

    req.app.conn.write.get().query({
        text: queryText,
        values: [
            currencyId.toUpperCase(),
            req.user.id,
            address,
            amount,
            code
        ]
    }, function(err, dr) {
        if (err) {
            log.error("withdraw error ", err.message);
            if (err.message.match(/non_negative_available/)) {
                return res.status(400).send({
                    name: 'NoFunds',
                    message: 'insufficient funds'
                })
            }

            return next(err)
        }

        req.app.activity(req.user.id, 'CryptoWithdraw', {
            address: req.body.address,
            currency: currencyId,
            amount: req.body.amount,
            address: address,
            code:code
        })
        var requestId = dr.rows[0].rid;
        log.info("withdraw requestId: ", requestId)
        res.status(201).send({ id: requestId })
    })
}

exports.address = function(currencyId, req, res, next) {
    var queryText = [
        'SELECT address',
        'FROM crypto_deposit_address',
        'WHERE account_id = user_currency_account($1, $2) AND currency_id = $2'
    ].join('\n');

    req.app.conn.read.get().query({
        text: queryText,
        values: [req.user.id, currencyId]
    }, function(err, dr) {
        if (err) return next(err)
        var address = dr.rows.length ? dr.rows[0].address : null
        if(!address){
            log.error("cannot retrieve %s address for user %s", currencyId, req.user.id)
        } else {
            log.debug("address %s %s for user %s", address, currencyId, req.user.id)
        }
        res.send({ address: address })
    })
}
