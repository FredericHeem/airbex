var log = require('./log')(__filename)
, debug = log.debug
, assert = require('assert')
, format = require('util').format

exports.createInstantBuy = function(userId, req, res, next) {
	if (!req.app.validate(req.body, 'v1/spend', res)) return

	debug("createInstantBuy: ", JSON.stringify(req.body));

	var quote = req.app.cache.getQuoteCurrency(req.body.market)
	var amount = req.app.cache.parseCurrency(req.body.amount, quote);
	debug("createInstantBuy %s in %s", amount, quote);

	req.app.conn.write.query("BEGIN");
	req.app.conn.write.query({
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
				return res.send(400, {
					name: 'NoFunds',
					message: 'Insufficient funds'
				})
			}

			if (err.message.match(/inserted with zero volume/)) {
				return res.send(400, {
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

	req.app.conn.write.query({
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
	req.app.conn.write.query("COMMIT", function() {
		debug("commited")
		res.send(201, {
			id: ""
		})
	})
}
exports.create = function(userId, req, res, next) {
    debug("create order user: %s, %s", userId, JSON.stringify(req.body));
    if (!req.app.validate(req.body, 'v1/order_create', res)) return
    var market = req.body.market;
    //debug("%s",JSON.stringify(req.app.cache.markets[market]))
    
    if (req.body.price !== null && !req.body.price.match(/^\d+(\.\d+)?$/)) {
        res.send({
            name: 'BadRequest',
            message: 'Price is invalid'
        })
    }

    var price = null
    , amount = req.app.cache.parseOrderVolume(req.body.amount, market)
    , query

    if (amount <= 0) {
        return res.send({
            name: 'BadRequest',
            message: 'Amount is <= 0'
        })
    }

    if(req.body.type === "bid"){
    	if(amount < req.app.cache.markets[market].bidminvolume){
            return res.send(400, {
                name: 'BadRequest',
                message: 'Volume too low'
            })       		
    	}
    } else {
    	if(amount < req.app.cache.markets[market].askminvolume){
            return res.send(400, {
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
        	if(price < req.app.cache.markets[market].bidminprice){
                return res.send(400, {
                    name: 'BadRequest',
                    message: 'Price too low'
                })       		
        	}
        } else {
        	if(price > req.app.cache.markets[market].askmaxprice){
                return res.send(400, {
                    name: 'BadRequest',
                    message: 'Price too high'
                })       		
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

    req.app.conn.write.query(query, function(err, dr) {
        if (err) {
            debug("create order error: %s", err.message);
            
            if (err.message.match(/transaction_amount_check/)) {
                return res.send(400, {
                    name: 'InvalidAmount',
                    message: 'The requested transfer amount is invalid/out of range'
                })
            }

            if (err.message.match(/non_negative_available/)) {
                return res.send(400, {
                    name: 'InsufficientFunds',
                    message: 'insufficient funds'
                })
            }

            if (/^price.*has too high accuracy$/.test(err.message)) {
                return res.send(400, {
                    name: 'TooHighPriceAccuracy',
                    message: 'Too many decimal places in price ' + req.body.price
                })
            }

            if (/^volume.*has too high accuracy$/.test(err.message)) {
                return res.send(400, {
                    name: 'TooHighVolumeAccuracy',
                    message: 'Too many decimal places in amount ' + req.body.amount
                })
            }

            return next(err)
        }

        var row = dr.rows[0]

        if (!row) {
            return res.send(404, {
                name: 'MarketNotFound',
                message: 'Market not found'
            })
        }

        if (row.oid === null) {
            return res.send(409, {
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

        res.send(201, { id: row.oid })
    })

  
}

