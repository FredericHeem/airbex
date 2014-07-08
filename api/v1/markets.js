module.exports = exports = function(app) {
    app.get('/v1/markets', exports.index)
    app.get('/v1/markets/:id/depth', exports.depth)
    app.get('/v1/markets/:id/vohlc', exports.vohlc)
}

exports.index = function(req, res, next) {
    function formatPriceOrNull(p, m) {
        if (p === null) return null
        return req.app.cache.formatOrderPrice(p, m)
    }

    function formatVolumeOrNull(v, m) {
        if (v === null) return null
        return req.app.cache.formatOrderVolume(v, m)
    }

    res.setHeader('Cache-Control', 'public, max-age=10')

    if(req.user && req.user.id){
        req.app.conn.read.query({
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
            values: [req.user.id]
        }, function(err, dr) {
            if (err) return next(err)
            res.send(dr.rows.map(function(row) {
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
        var query = 'SELECT * FROM market_summary_view';
        req.app.conn.read.query(query, function(err, dr) {
            if (err) return next(err)
            res.send(dr.rows.map(function(row) {
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

exports.depth = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT price, volume, "type"',
            'FROM order_depth_view odv',
            'INNER JOIN market m ON m.market_id = odv.market_id',
            'WHERE m.base_currency_id || m.quote_currency_id = $1',
            'ORDER BY CASE WHEN type = \'ask\' THEN price ELSE -price END'
        ].join('\n'),
        values: [req.params.id]
    }, function(err, dr) {
        if (err) return next(err)

        res.setHeader('Cache-Control', 'public, max-age=10')

        res.send({
            bids: dr.rows.filter(function(row) {
                return row.type == 'bid'
            }).map(function(row) {
                return [
                    req.app.cache.formatOrderPrice(row.price, req.params.id),
                    req.app.cache.formatOrderVolume(row.volume, req.params.id)
                ]
            }),

            asks: dr.rows.filter(function(row) {
                return row.type == 'ask'
            }).map(function(row) {
                return [
                    req.app.cache.formatOrderPrice(row.price, req.params.id),
                    req.app.cache.formatOrderVolume(row.volume, req.params.id)
                ]
            })
        })
    })
}

exports.vohlc = function(req, res, next) {
    req.app.conn.read.query({
        text: [
            'SELECT *',
            'FROM vohlc',
            'WHERE market = $1'
        ].join('\n'),
        values: [req.params.id]
    }, function(err, dr) {
        if (err) return next(err)

        res.setHeader('Cache-Control', 'public, max-age=30')
        res.send(dr.rows.map(function(row) {
            return {
                date: row.date,
                volume: req.app.cache.formatOrderVolume(row.volume, req.params.id),
                open: req.app.cache.formatOrderPrice(row.open, req.params.id),
                high: req.app.cache.formatOrderPrice(row.high, req.params.id),
                low: req.app.cache.formatOrderPrice(row.low, req.params.id),
                close: req.app.cache.formatOrderPrice(row.close, req.params.id)
            }
        }))
    })
}
