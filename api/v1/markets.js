var log = require('../log')(__filename)
, debug = log.debug;

var wsMessages = {
    markets:'/v1/markets',
    marketsInfo:'/v1/markets/info',
    marketDepth: '/v1/market/depth'
};

module.exports = exports = function(app) {
    exports.app = app;
    app.get('/v1/markets', exports.index)
    app.get('/v1/markets/:marketId/depth', exports.depthRest)
    app.get('/v1/markets/:marketId/vohlc', exports.vohlc)
    app.get('/v1/markets/info', app.security.demand.any, exports.marketsInfoRest)
    app.socketio.router.on(wsMessages.markets, exports.marketsWs);
    app.socketio.router.on(wsMessages.marketsInfo, app.socketio.demand, exports.marketsInfoWs);
    app.socketio.router.on(wsMessages.marketDepth, exports.depthWs);
}

function formatPriceOrNull(app, p, m) {
    if (p === null) return null
    return app.cache.formatOrderPrice(p, m)
}

function formatVolumeOrNull(app, v, m) {
    if (v === null) return null
    return app.cache.formatOrderVolume(v, m)
}

exports.marketsInfoGet = function(app, user, cb){
    //debug("marketsInfoGet");
    app.conn.read.get().query({
        text: [
        "SELECT m.market_id,",
        "m.name,",
        "m.base_currency_id,",
        "m.quote_currency_id,",
        "m.bidminvolume,",
        "m.bidminprice,",
        "m.askminvolume,",
        "m.askmaxprice,",
        "m.bidmintotal,",
        "m.askmintotal,",
        "m.quote_scale_diplay,",
        "(SELECT fee_bid_taker_ratio($1, m.market_id)) AS fee_bid_taker,",
        "(SELECT fee_bid_maker_ratio($1, m.market_id)) AS fee_bid_maker,",
        "(SELECT fee_ask_taker_ratio($1, m.market_id)) AS fee_ask_taker,",
        "(SELECT fee_ask_maker_ratio($1, m.market_id)) AS fee_ask_maker ",
        "FROM market_active_view m",
        "ORDER BY m.base_currency_id, m.quote_currency_id"
        ].join('\n'),
        values: [user.id]
    }, function(err, dr) {
        if (err) return cb(err);
        return cb(null, dr.rows.map(function(row) {
            var name = row.name || (row.base_currency_id + row.quote_currency_id)
            return {
                id: name,
                bidminvolume: formatVolumeOrNull(app, row.bidminvolume, name),
                bidminprice: formatPriceOrNull(app, row.bidminprice,name),
                askminvolume: formatVolumeOrNull(app, row.askminvolume,name),
                askmaxprice: formatPriceOrNull(app, row.askmaxprice,name),
                bidmintotal: formatPriceOrNull(app, row.bidmintotal,name),
                askmintotal: formatPriceOrNull(app, row.askmintotal,name),
                fee_bid_taker: row.fee_bid_taker,
                fee_bid_maker: row.fee_bid_maker,
                fee_ask_taker: row.fee_ask_taker,
                fee_ask_maker: row.fee_ask_maker
            }
        }))
    })
}

exports.marketsInfoRest = function(req, res, next) {
    exports.marketsInfoGet(req.app, req.user, function(err, response){
        if(err) return next(err);
        res.send(response);
    })
}

exports.marketsInfoWs = function(client, eventName, data, next) {
    var callbackId = exports.app.socketio.callbackId(data);
    debug("marketsInfoWs callbackId: %s", callbackId);
    exports.marketsInfoGet(exports.app, client.user, function(err, response){
        if(err) return next({name:"DbError", message:JSON.stringify(err)})
        client.emit(wsMessages.marketsInfo, {callbackId: callbackId, data:response})
    })
}

exports.marketsGet = function(app, user, cb){
    //debug("marketGet");
    var query = 'SELECT * FROM market_summary_view';
    app.conn.read.get().query(query, function(err, dr) {
        //debug("getting markets done")
        if (err) {
            log.error(JSON.stringify(err))
            return cb(err);
        }
        return cb(null, dr.rows.map(function(row) {
            //debug("market: ", row)
            var name = row.name || (row.base_currency_id + row.quote_currency_id)
            return {
                id: name,
                bc:row.base_currency_id,
                qc:row.quote_currency_id,
                last: formatPriceOrNull(app, row.last, name),
                high: formatPriceOrNull(app, row.high, name),
                low: formatPriceOrNull(app, row.low, name),
                bid: formatPriceOrNull(app, row.bid, name),
                ask: formatPriceOrNull(app, row.ask, name),
                volume: formatVolumeOrNull(app, row.volume, name),
                quote_scale_diplay:row.quote_scale_diplay
            }
        }))
    })
}

exports.marketsWs = function(client, eventName, data, next) {
    var callbackId = exports.app.socketio.callbackId(data);
    //debug("marketsWs callbackId: %s", callbackId);
    exports.marketsGet(exports.app, client.user, function(err, response){
        if(err) return next({name:"DbError", message:JSON.stringify(err)})
        client.emit(wsMessages.markets, {callbackId: callbackId, data:response})
    })
}

exports.index = function(req, res, next) {
    exports.marketsGet(req.app, req.user, function(err, response){
        if(err) return next(err);
        res.send(response);
    })
}

exports.depthWs = function(client, eventName, data, next) {
    var inputs = data ? data.inputs : undefined;
    var callbackId = exports.app.socketio.callbackId(data);
    exports.depthGet(exports.app, inputs, function(err, response){
        if(err) return next({name:"DbError", message:JSON.stringify(err)})
        //debug("depthGet for ", JSON.stringify(response));
        client.emit(wsMessages.marketDepth, {callbackId: callbackId, data:response})
    })
}

exports.depthRest = function(req, res, next) {
    exports.depthGet(exports.app, req.params, function(err, response){
        if(err) return next(err)
        res.setHeader('Cache-Control', 'public, max-age=10');
        res.send(response);
    })
}

exports.depthGet = function(app, params, cb) {
    if(!params || !params.marketId){
        return cb({name:"BadRequest", message:"Invalid parameter"})
    }
    
    //debug("depthGet for ", params.marketId)
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
