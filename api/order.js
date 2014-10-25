var log = require('./log')(__filename)
, debug = log.debug
, assert = require('assert')
, format = require('util').format
, num = require('num');

exports.createInstantBuy = function(userId, req, res, next) {
	if (!req.app.validate(req.body, 'v1/spend', res)) return

	debug("createInstantBuy: ", JSON.stringify(req.body));

	var quote = req.app.cache.getQuoteCurrency(req.body.market)
	var amount = req.app.cache.parseCurrency(req.body.amount, quote);
	debug("createInstantBuy %s in %s", amount, quote);

	req.app.conn.write.get().query("BEGIN");
	req.app.conn.write.get().query({
		text: 
			[
			 'SELECT convert_bid($1, market_id, $2) oid',
			 'FROM market',
			 'WHERE base_currency_id || quote_currency_id = $3;'
			 ].join('\n'),
			 values: 
				 [userId,
				  amount,
				  req.body.market
				  ]
	}, function(err, dr) {
		if (err) {
			debug("spend error: %s", err.message);
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
	})	

	req.app.conn.write.get().query({
		text: "UPDATE purchase_order set state = $1 where id = $2",
		values: [
		         'Purchased',
		         req.body.purchaseorder_id
		         ]
	}, function(err, dr) {
		if (err) {
			debug("spend error: %s", err.message);
			return next(err)
		}
	})	
	req.app.conn.write.get().query("COMMIT", function() {
		debug("commited")
		res.send(201, {
			id: ""
		})
	})
}
exports.create = function(userId, req, res, next) {
    log.verbose("create order user: %s, %s", userId, JSON.stringify(req.body));
    if (!req.app.validate(req.body, 'v1/order_create', res)) {
        log.error("create order: InvalidRequest")
        return;
    }
    
    var market = req.body.market;
    if(!req.app.cache.markets[market]){
        log.error("create order: Market is invalid")
        return  res.send({
            name: 'BadRequest',
            message: 'Market is invalid'
        })
    }
    //debug("%s",JSON.stringify(req.app.cache.markets[market]))
    
    if (req.body.price !== null && !req.body.price.match(/^\d+(\.\d+)?$/)) {
        log.error("create order: Price is invalid")
        return res.send({
            name: 'BadRequest',
            message: 'Price is invalid'
        })
    }

    var price = null
    , amount = req.app.cache.parseOrderVolume(req.body.amount, market)
    , query

    if(req.body.type === "bid"){
        if(num(amount).lt(req.app.cache.markets[market].bidminvolume)){
            return res.status(400).send({
                name: 'BadRequest',
                message: 'Volume too low'
            })
        }
    } else {
        if(num(amount).lt(req.app.cache.markets[market].askminvolume)){
            return res.status(400).send({
                name: 'BadRequest',
                message: 'Volume too low'
            })
        }
    }
    
    if (req.body.price !== null) {
        price = req.app.cache.parseOrderPrice(req.body.price, market)

        if (price <= 0) {
            return res.send({
                name: 'BadRequest',
                message: 'Price is <= 0'
            })
        }
        
        if(req.body.type === "bid"){
            if(num(price).lt(req.app.cache.markets[market].bidminprice)){
                return res.status(400).send({
                    name: 'BadRequest',
                    message: 'Price too low'
                })
            }
        } else {
            if(num(price).gt(req.app.cache.markets[market].askmaxprice)){
                var error = {
                        name: 'BadRequest',
                        message: 'Price too high',
                        price:price,
                        askmaxprice: req.app.cache.markets[market].askmaxprice
                }
                log.error(error)
                return res.status(400).send(error)
            }
        }
    }

    if (req.body.aon) {
        query = {
            text: [
                'SELECT create_order_aon($1, market_id, $3, $4, $5) oid',
                'FROM market',
                'WHERE base_currency_id || quote_currency_id = $2'
            ].join('\n'),
            values: [
                userId,
                market,
                req.body.type == 'bid' ? 0 : 1,
                price,
                amount
            ]
        }
    } else {
        query = {
            text: [
                'INSERT INTO "order" (user_id, market_id, "type", price, volume)',
                'SELECT $1, market_id, $3, $4, $5',
                'FROM market',
                'WHERE base_currency_id || quote_currency_id = $2',
                'RETURNING order_id oid'
            ].join('\n'),
            values: [
                userId,
                market,
                req.body.type,
                price,
                amount
            ]
        }
    }

    req.app.conn.write.get().query(query, function(err, dr) {
        if (err) {
            log.error("create order error: %s", err.message);
            
            if (err.message.match(/transaction_amount_check/)) {
                return res.status(400).send({
                    name: 'InvalidAmount',
                    message: 'The requested transfer amount is invalid/out of range'
                })
            }

            if (err.message.match(/non_negative_available/)) {
                return res.status(400).send({
                    name: 'InsufficientFunds',
                    message: 'insufficient funds'
                })
            }

            if (/^price.*has too high accuracy$/.test(err.message)) {
                return res.status(400).send({
                    name: 'TooHighPriceAccuracy',
                    message: 'Too many decimal places in price ' + req.body.price
                })
            }

            if (/^volume.*has too high accuracy$/.test(err.message)) {
                return res.status(400).send({
                    name: 'TooHighVolumeAccuracy',
                    message: 'Too many decimal places in amount ' + req.body.amount
                })
            }

            return next(err)
        }

        var row = dr.rows[0]

        if (!row) {
            return res.status(404).send({
                name: 'MarketNotFound',
                message: 'Market not found'
            })
        }

        if (row.oid === null) {
            return res.status(409).send({
                name: 'FailedToMatchEntireOrder',
                message: 'Failed to match entire all-or-nothing order'
            })
        }

        req.app.activity(userId, 'CreateOrder', {
            market: market,
            type: req.body.type,
            price: req.body.price,
            amount: req.body.amount,
            address: req.body.address,
            aon: req.body.aon || false
        })

        res.status(201).send({ id: row.oid })
    })
}

