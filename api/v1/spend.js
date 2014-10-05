var log = require('../log')(__filename)
, debug = log.debug
, num = require('num');

module.exports = exports = function(app) {
    app.post('/v1/spend', app.security.demand.trade, exports.spend)
}

exports.spend = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/spend', res)) {
        log.error("spend Invalid request");
        return
    }
    
    var market = req.body.market;
    var userId = req.user.id;
    debug("spend: userId: %s, param: ", userId, JSON.stringify(req.body));
    
    if(!req.app.cache.markets[market]){
        return res.status(404).send({
            name: 'MarketNotFound',
            message: 'Market not found'
        })
    }
    
    var quote = req.app.cache.getQuoteCurrency(market)

    var amountFormatted = req.app.cache.parseCurrency(req.body.amount, quote) 
    var bidmintotal = req.app.cache.markets[market].bidmintotal;
    
    if(num(amountFormatted).lt(bidmintotal)){
        return res.status(400).send({
            name: 'VolumeTooLow',
            message: 'Volume too low, minimum is ' + req.app.cache.formatCurrency(bidmintotal, quote)  + ' ' + quote
        })
    }
    
    req.app.conn.write.get().query({
        text: [
            'SELECT convert_bid($1, market_id, $2) oid',
            'FROM market',
            'WHERE base_currency_id || quote_currency_id = $3'
        ].join('\n'),
        values: [
            userId,
            amountFormatted,
            market
        ]
    }, function(err, dr) {
        if (err) {
            log.error("spend error: %s", err.message);
            if (err.message.match(/not enough liquidity/)) {
                return res.status(400).send({
                    name: 'AmountTooHigh',
                    message: 'Not enough liquidity'
                })
            }
            if (err.message.match(/non_negative_available/)) {
                return res.status(400).send({
                    name: 'NoFunds',
                    message: 'Insufficient funds'
                })
            }

            if (err.message.match(/inserted with zero volume/)) {
                return res.status(400).send({
                    name: 'AmountTooSmall',
                    message: 'Spend amount is too small'
                })
            }

            return next(err)
        }

        if (!dr.rowCount) {
            return res.send(404, {
                name: 'MarketNotFound',
                message: 'Market not found'
            })
        }
        
        var oid = dr.rows[0].oid;
        debug("spend oid: ", oid)
        res.status(201).send({
            id: oid
        })
    })
}
