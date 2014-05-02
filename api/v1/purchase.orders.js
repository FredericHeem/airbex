var debug = require('debug')('snow:purchaseorder')

module.exports = exports = function(app) {
    app.post('/v1/purchaseOrder', app.security.demand.trade(2), exports.create)
    app.get('/v1/purchaseOrder', app.security.demand.any, exports.read)
    app.del('/v1/purchaseOrder/:id', app.security.demand.trade, exports.cancel)
}

exports.create = function(req, res, next) {
    if (!req.app.validate(req.body, 'v1/purchase_order_create', res)) return

    debug("create purchase order: ", JSON.stringify(req.body));
    
    var market_id = req.body.market;
    var address = req.body.address;
    if(!req.app.cache.getMarket(market_id)){
        return res.send(400, {
            name: 'InvalidMarket',
            message: 'Invalid market ' + market_id
        })     	
    }
    
    var amount = req.app.cache.parseOrderPrice(req.body.amount, market_id)
    , query

    if (amount <= 0) {
        return res.send({
            name: 'BadRequest',
            message: 'Amount is <= 0'
        })
    }

    var bidMinVolume = 2000000; // 20 balles
    var askMinVolume = 10000000; // 0.1 BTC
    
    if(req.body.type === "bid"){
    	if(amount < bidMinVolume){
            return res.send(400, {
                name: 'BadRequest',
                message: 'Volume too low'
            })       		
    	}
    } else {
    	if(amount < askMinVolume){
            return res.send(400, {
                name: 'BadRequest',
                message: 'Volume too low'
            })       		
    	}       	
    }

    query = {
    		text: 
    			[
    			 'INSERT INTO "purchase_order" (user_id, market_id, "type", amount, address)',
    			 'SELECT $1, market_id, $3, $4, $5',
    			 'FROM market',
    			 'WHERE name = $2',
    			 'RETURNING id poid'
    			 ].join('\n'),
    			 values: 
    				 [
    				  req.user.id,
    				  market_id,
    				  req.body.type,
    				  amount,
    				  address
    				  ]
    }
    debug("create %s", query);
    req.app.conn.write.query(query, function(err, dr) {
        if (err) {
            debug("create purchase order error: %s", err.message);
            
            if (err.message.match(/transaction_amount_check/)) {
                return res.send(400, {
                    name: 'InvalidAmount',
                    message: 'The requested transfer amount is invalid/out of range'
                })
            }

            if (/^amount.*has too high accuracy$/.test(err.message)) {
                return res.send(400, {
                    name: 'TooHighPriceAccuracy',
                    message: 'Too many decimal places in price ' + req.body.price
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

        req.app.activity(req.user.id, 'PurchaseOrderCreate', {
            market: market_id,
            type: req.body.type,
            amount: req.body.amount,
            address: req.body.address
        })

        res.send(201, { id: row.poid })
    })
}

function formatPurchaseOrderRow(cache, row) {
    return {
        id: row.id,
        market_id: row.market_id,
        type: row.type,
        address: row.address,
        amount: cache.formatOrderVolume(row.amount, row.name),
        state: row.state,
        created_at: row.created_at
    }
}

exports.read = function(req, res, next) {
	var user_id = req.user.id;
	debug("read: user id: ", user_id)
    req.app.conn.read.query({
        text: [
            'SELECT po.id, m.name, po.type, po.amount, po.address, po.state, po.created_at',
            'FROM purchase_order po',
            'JOIN market m ON m.market_id = po.market_id',
            'WHERE user_id = $1',
            'ORDER BY id DESC'
        ].join('\n'),
        values: [user_id]
    }, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(formatPurchaseOrderRow.bind(this, req.app.cache)))
    })
}

exports.cancel = function(req, res, next) {
	debug("cancel id %s for user: ", req.params.id, req.user.id);
    req.app.conn.write.query({
        text: [
            'UPDATE "purchase_order"',
            'SET',
            "   state = 'cancelled'",
            'WHERE',
            '   id = $1 AND',
            '   user_id = $2'
        ].join('\n'),
        values: [+req.params.id, req.user.id]
    }, function(err, dr) {
        if (err) return next(err)
        if (!dr.rowCount) {
        	var error = {
        			name: 'PurchaseOrderNotFound',
        			message: 'The specified purchase order does not exist or has been canceled'
        	};
        	debug("cancel error: ", error.name)
            return res.send(404, error)
        }
        res.send(204)
        req.app.activity(req.user.id, 'PurchaseOrderCancel', { id: +req.params.id })
    })
}
