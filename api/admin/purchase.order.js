var _ = require('lodash')
, format = require('util').format
, log = require('../log')(__filename)
, debug = log.debug
, builder = require('pg-builder')

module.exports = exports = function(app) {
	 app.post('/admin/purchaseOrder/:id', app.security.demand.admin, exports.update)
	 app.get('/admin/purchaseOrder', app.security.demand.admin, exports.read)
}

function formatPurchaseOrderRow(cache, row) {
    return {
        id: row.id,
        user_id: row.user_id,
        market_name: row.name,
        base_currency: cache.getBaseCurrency(row.name),
        quote_currency:cache.getQuoteCurrency(row.name),
        type: row.type,
        address: row.address,
        amount: cache.formatOrderPrice(row.amount, row.name),
        state: row.state,
        created_at: row.created_at
    }
}

exports.read = function(req, res, next) {
	debug("read")
	var user_id = req.user.id;
    req.app.conn.read.get().query({
        text: [
            'SELECT po.id, po.user_id, m.name, po.type, po.amount, po.address, po.state, po.created_at',
            'FROM purchase_order po',
            'JOIN market m ON m.market_id = po.market_id',
            'ORDER BY id DESC'
        ].join('\n')
    }, function(err, dr) {
        if (err) return next(err)
        res.send(dr.rows.map(formatPurchaseOrderRow.bind(this, req.app.cache)))
    })
}

exports.update = function(req, res, next) {
    //if (!req.app.validate(req.body, 'v1/purchase_order_create', res)) return
    var purchaseOrderId = +req.params.id
    var userId = req.params.user
    var state = req.body.state;
    debug("update purchase order: %s for user %s, state %s", purchaseOrderId, userId, state);
    
    query = {
    		text: 
    			[
    			 'UPDATE "purchase_order"',
    			 'SET state = $3',
    			 'WHERE id = $2 AND user_id = $1'
    			 ].join('\n'),
    			 values: 
    				 [
                      userId,
    				  purchaseOrderId,
    				  state
    				  ]
    }
    
    debug("update %s", query);
    req.app.conn.write.get().query(query, function(err, dr) {
    	debug("update got db");
        if (err) {
            debug("update purchase order error: %s", err.message);
            return next(err)
        }

        req.app.activity(userId, 'PurchaseOrderUpdate', {
            state: state
        })

        res.send(201, { id: purchaseOrderId })
    })
}