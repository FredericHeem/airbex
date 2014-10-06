var withdraws = require('../withdraws')
, _ = require('lodash')
, log = require('../log')(__filename)
, debug = log.debug
, num = require('num')

module.exports = exports = function(app) {
    app.delete('/v1/withdraws/:id', app.security.demand.withdraw, exports.cancel)
    app.post('/v1/withdraws/bank', app.security.demand.withdraw(4), exports.withdrawBank)

    app.get('/v1/withdraws', app.security.demand.any, function(req, res, next) {
        withdraws.query(req.app, { user_id: req.user.id }, function(err, items) {
            if (err) return next(err)
            res.send(items.map(function(item) {
                return _.omit(item, 'user')
            }))
        })
    })
}

exports.withdrawBank = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/withdraw_bank', res)) return
    var userId = req.user.id;
    var currency = req.body.currency;
    var amount = req.body.amount;
    
    if(!req.app.cache.currencies[currency]){
        return res.status(400).send({
            name: 'InvalidCurrency',
            message: 'Invalid currency: ' + currency
        });
    }

    
    if (!req.app.cache.currencies[currency].fiat) {
        return res.status(400).send({
            name: 'CannotWithdrawNonFiatToBank',
            message: 'Cannot withdraw non-fiat to a bank account'
        })
    }
    var withdraw_min = req.app.cache.currencies[currency].withdraw_min;
    var withdraw_max = req.app.cache.currencies[currency].withdraw_max;
    var amountParsed = req.app.cache.parseCurrency(amount, currency)
    
    debug("withdrawBank user_id: %s, %s %s, min: %s, to ba %s", 
            userId, amount, currency, withdraw_min, req.body.bankAccount);
    
    if (num(amountParsed).lt(withdraw_min)) {
        return res.status(400).send({
            name: 'AmountTooSmall',
            message: 'Minimum amount is ' + req.app.cache.formatCurrency(withdraw_min, currency) + ' '  + currency
        })
    }
    
    if (num(amountParsed).gt(withdraw_max)) {
        return res.status(400).send({
            name: 'AmountTooHigh',
            message: 'Maximum amount is ' + req.app.cache.formatCurrency(withdraw_max, currency) + ' '  + currency
        })
    }
    req.app.conn.write.get().query({
        text: [
            'SELECT withdraw_bank($2, $3, $4, $5)',
            'FROM bank_account',
            'WHERE bank_account_id = $2 AND user_id = $1'
        ].join('\n'),
        values: [
            req.user.id,
            +req.body.bankAccount,
            currency,
            amountParsed,
            req.body.forceSwift === undefined ? null : req.body.forceSwift
        ]
    }, function(err, dr) {
        if (err) {
            if (err.message.match(/non_negative_available/)) {
                return res.status(500).send({
                    name: 'NoFunds',
                    message: 'Insufficient funds.'
                })
            }
            return next(err)
        }

        if (!dr.rowCount) {
            return res.status(400).send({
                name: 'BankAccountNotFound',
                message: 'Bank account not found for this user'
            })
        }
        var withdrawRequestParam = req.body;
        withdrawRequestParam.method = "bank";
        req.app.activity(req.user.id, 'WithdrawRequest', withdrawRequestParam)
        return res.status(204).end()
    })
}

exports.cancel = function(req, res, next) {
    debug("cancel user:%s, wid:%s", req.user.id, req.params.id)
    req.app.conn.write.get().query({
        text: [
            'SELECT cancel_withdraw_request($1, null) request_id',
            'FROM withdraw_request wr',
            'INNER JOIN account a ON a.account_id = wr.account_id',
            'WHERE',
            '   (wr.state = \'requested\' OR wr.state = \'sendingEmail\') AND',
            '   a.user_id = $2 AND request_id = $1'
        ].join('\n'),
        values: [+req.params.id, req.user.id]
    }, function(err, dr) {
       
        if (err) {
            debug("cancel error: %s", err.message)
            if (err.message.match(/does not exist or has no hold/)) {
                return res.status(404).send({
                    name: 'WithdrawRequestNotFound',
                    message: 'The withdraw request was not found, ' +
                        'does not belong to the user, or is already processing/processed'
                })
            }
            return next(err)
        }
        if (!dr.rowCount) {
            return res.status(404).send({
                name: 'WithdrawRequestNotFound',
                message: 'The withdraw request was not found, ' +
                    'does not belong to the user, or is already processing/processed'
            })
        }

        req.app.activity(req.user.id, 'CancelWithdrawRequest', { id: +req.params.id })

        res.status(204).end()
    })
}
