var log = require('../log')(__filename)
, debug = log.debug;

var wsMessages = {
    markets:'markets',
    marketDepth: '/v1/market/depth'
};

module.exports = exports = function(app) {
    exports.app = app;
    app.get('/v1/markets', exports.index)
    app.get('/v1/markets/:marketId/depth', exports.depthRest)
    app.get('/v1/markets/:marketId/vohlc', exports.vohlc)
    
    app.socketio.router.on(wsMessages.markets, exports.marketsWs);
    app.socketio.router.on(wsMessages.marketDepth, exports.depthWs);
}

var marketsGet = function(app, user, cb){
    
    function formatPriceOrNull(p, m) {
        if (p === null) return null
        return app.cache.formatOrderPrice(p, m)
    }

    function formatVolumeOrNull(v, m) {
        if (v === null) return null
        return app.cache.formatOrderVolume(v, m)
    }

    if(user && user.id){
        debug("markets with user id: ", user.id)
        app.conn.read.get().query({
            text: [
            "SELECT m.market_id,",
            "m.name,",
            "m.bidminvolume,",
            "m.bidminprice,",
            "m.askminvolume,",
            "m.askmaxprice,",
            "m.bidmintotal,",
            "m.askmintotal,",
            "m.base_currency_id,",
            "m.quote_currency_id,",
            "(SELECT fee_bid_taker_ratio($1, m.market_id)) AS fee_bid_taker,",
            "(SELECT fee_bid_maker_ratio($1, m.market_id)) AS fee_bid_maker,",
            "(SELECT fee_ask_taker_ratio($1, m.market_id)) AS fee_ask_taker,",
            "(SELECT fee_ask_maker_ratio($1, m.market_id)) AS fee_ask_maker,",
            "(SELECT max(o.price) AS max FROM order_view o WHERE (((o.market_id = m.market_id) AND (o.type = 'bid')) AND (o.volume > 0))) AS bid,",
            "(SELECT min(o.price) AS min FROM order_view o WHERE (((o.market_id = m.market_id) AND (o.type = 'ask')) AND (o.volume > 0))) AS ask,",
            '(SELECT om.price FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE (bo.market_id = m.market_id) ORDER BY om.created_at DESC LIMIT 1) AS last,', 
            '(SELECT max(om.price) AS max FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE ((bo.market_id = m.market_id) AND (age(om.created_at) < \'1 day\'::interval))) AS high,', 
            '(SELECT min(om.price) AS min FROM (match_view om JOIN "order" bo ON ((bo.order_id = om.bid_order_id))) WHERE ((bo.market_id = m.market_id) AND (age(om.created_at) < \'1 day\'::interval))) AS low,', 
            "(SELECT sum(ma.volume) AS sum FROM (match ma JOIN order_view o ON ((ma.bid_order_id = o.order_id))) WHERE ((o.market_id = m.market_id) AND (age(ma.created_at) < '1 day'::interval))) AS volume", 
            "FROM market m ORDER BY m.base_currency_id, m.quote_currency_id"          
            ].join('\n'),
            values: [user.id]
        }, function(err, dr) {
            if (err) return cb(err);
            return cb(null, dr.rows.map(function(row) {
                var name = row.name || (row.base_currency_id + row.quote_currency_id)
                return {
                    id: name,
                    bc:row.base_currency_id,
                    qc:row.quote_currency_id,
                    last: formatPriceOrNull(row.last, name),
                    high: formatPriceOrNull(row.high, name),
                    low: formatPriceOrNull(row.low, name),
                    bid: formatPriceOrNull(row.bid, name),
                    ask: formatPriceOrNull(row.ask, name),
                    volume: formatVolumeOrNull(row.volume, name),
                    bidminvolume: formatVolumeOrNull(row.bidminvolume, name),
                    bidminprice: formatPriceOrNull(row.bidminprice,name),
                    askminvolume: formatVolumeOrNull(row.askminvolume,name),
                    askmaxprice: formatPriceOrNull(row.askmaxprice,name),
                    bidmintotal: formatPriceOrNull(row.bidmintotal,name),
                    askmintotal: formatPriceOrNull(row.askmintotal,name),
                    fee_bid_taker: row.fee_bid_taker,
                    fee_bid_maker: row.fee_bid_maker,
                    fee_ask_taker: row.fee_ask_taker,
                    fee_ask_maker: row.fee_ask_maker,
                }
            }))
        })
    } else {
        debug("markets public");
        var query = 'SELECT * FROM market_summary_view';
        app.conn.read.get().query(query, function(err, dr) {
            debug("getting markets done")
            if (err) {
                log.error(JSON.stringify(err))
                return cb(err);
            }
            return cb(null, dr.rows.map(function(row) {
                var name = row.name || (row.base_currency_id + row.quote_currency_id)
                return {
                    id: name,
                    bc:row.base_currency_id,
                    qc:row.quote_currency_id,
                    last: formatPriceOrNull(row.last, name),
                    high: formatPriceOrNull(row.high, name),
                    low: formatPriceOrNull(row.low, name),
                    bid: formatPriceOrNull(row.bid, name),
                    ask: formatPriceOrNull(row.ask, name),
                    volume: formatVolumeOrNull(row.volume, name)
                }
            }))
        })
    }
}

exports.marketsWs = function(client, args, next) {
    var callbackId = exports.app.socketio.callbackId(args);
    marketsGet(exports.app, client.user, function(err, response){
        if(err) return next({name:"DbError", message:JSON.stringify(err)})
        client.emit(wsMessages.markets, {callbackId: callbackId, data:response})
    })
}

exports.index = function(req, res, next) {
    marketsGet(req.app, req.user, function(err, response){
        if(err) return next(err);
        res.send(response);
    })
}

exports.depthWs = function(client, args, next) {
    
    var params = args[1];
    var callbackId = exports.app.socketio.callbackId(args);
    depthGet(exports.app, params, function(err, response){
        if(err) return next({name:"DbError", message:JSON.stringify(err)})
        debug("depthGet for ", JSON.stringify(response));
        client.emit(wsMessages.marketDepth, {callbackId: callbackId, data:response})
    })
}

exports.depthRest = function(req, res, next) {
    depthGet(exports.app, req.params, function(err, response){
        if(err) return next(err)
        res.setHeader('Cache-Control', 'public, max-age=10');
        res.send(response);
    })
}

var depthGet = function(app, params, cb) {
    if(!params || !params.marketId){
        return cb({name:"BadRequest", message:"Invalid parameter"})
    }
    
    debug("depthGet for ", params.marketId)
    app.conn.read.get().query({
        text: [
            'SELECT price, volume, "type"',
            'FROM order_depth_view odv',
            'INNER JOIN market m ON m.market_id = odv.market_id',
            'WHERE m.base_currency_id || m.quote_currency_id = $1',
            'ORDER BY CASE WHEN type = \'ask\' THEN price ELSE -price END'
        ].join('\n'),
        values: [params.marketId]
    }, function(err, dr) {
        if (err) return cb(err)

        cb(null, {
            marketId:params.marketId, 
            bids: dr.rows.filter(function(row) {
                return row.type == 'bid'
            }).map(function(row) {
                return [
                    app.cache.formatOrderPrice(row.price, params.marketId),
                    app.cache.formatOrderVolume(row.volume, params.marketId)
                ]
            }),

            asks: dr.rows.filter(function(row) {
                return row.type == 'ask'
            }).map(function(row) {
                return [
                    app.cache.formatOrderPrice(row.price, params.marketId),
                    app.cache.formatOrderVolume(row.volume, params.marketId)
                ]
            })
        })
    })
}

exports.vohlc = function(req, res, next) {
    req.app.conn.read.get().query({
        text: [
            'SELECT *',
            'FROM vohlc',
            'WHERE market = $1'
        ].join('\n'),
        values: [req.params.marketId]
    }, function(err, dr) {
        if (err) return next(err)

        res.setHeader('Cache-Control', 'public, max-age=30')
        res.send(dr.rows.map(function(row) {
            return {
                date: row.date,
                volume: req.app.cache.formatOrderVolume(row.volume, req.params.marketId),
                open: req.app.cache.formatOrderPrice(row.open, req.params.marketId),
                high: req.app.cache.formatOrderPrice(row.high, req.params.marketId),
                low: req.app.cache.formatOrderPrice(row.low, req.params.marketId),
                close: req.app.cache.formatOrderPrice(row.close, req.params.marketId)
            }
        }))
    })
}
