var template = require('./index.html')
, _ = require('lodash')
, nav = require('../nav')

function depthToAccumulative(depth) {
    function toHash(pairs) {
        return _.reduce(pairs, function(p, c) {
            p[c[0]] = c[1]
            return p
        }, {})
    }

    if (depth.bids.length && depth.asks.length) {
        var center = (parseFloat(depth.bids[0][0]) + parseFloat(depth.asks[0][0])) / 2
        , maxSpread = 0.25

        depth.bids = depth.bids.filter(function(x) {
            return x[0] >= center * (1 - maxSpread)
        })

        depth.asks = depth.asks.filter(function(x) {
            return x[0] <= center * (1 + maxSpread)
        })
    }

    var hash = {
        bids: toHash(depth.bids),
        asks: toHash(depth.asks)
    },
    prices = _.pluck(depth.bids, 0)
    .concat(_.pluck(depth.asks, 0))
    .sort(function(a, b) { return a - b })

    var series = {
        bids: _.map(prices, function(p) {
            return [+p, +hash.bids[p] || null]
        }),
        asks: _.map(prices, function(p) {
            return [+p, +hash.asks[p] || null]
        })
    }

    var i

    for (i = 1; i < prices.length; i++) {
        if (!series.asks[i][1]) continue
        series.asks[i][1] += series.asks[i-1][1]
    }

    for (i = prices.length - 2; i >= 0; i--) {
        if (!series.bids[i][1]) continue
        series.bids[i][1] += series.bids[i+1][1]
    }

    return series
}

function vohlcToPrices(vohlc) {
    var prices = []

    // Transform to Highstock format
    for (var i = 0; i < vohlc.length; i++) {
        prices.push([+new Date(vohlc[i].date), +vohlc[i].close])
    }

    return prices
}

function splitVohlc(data) {
    var ohlc = [], volume = []

    for (var i = 0; i < data.length; i++) {
        ohlc.push([
            +new Date(data[i].date),
            +data[i].open,
            +data[i].high,
            +data[i].low,
            +data[i].close
        ])

        volume.push([
            +new Date(data[i].date),
            +data[i].volume
        ])
    }

    return { volume: volume, ohlc: ohlc }
}

module.exports = function(market) {
    var base = market.substr(0, 3)
    , quote = market.substr(3)
    , $el = $('<div class=trade-stats>').html(template({
        market: market,
        base: base,
        quote: quote
    }))
    , controller = {
        $el: $el
    }

    var navMode = $.cookie('tradeMode') == 'advanced' ? 'limit' : 'market'
    $el.find('.trade-nav')
    .replaceWith(nav(market, navMode, 'stats').$el)

    var depth = api.call('v1/markets/' + market + '/depth')

    depth.then(depthToAccumulative)
    .done(function(accu) {
        var options = _.clone(require('./book-accu.json'), true)
        options.series[0].data = accu.bids
        options.series[1].data = accu.asks
        options.series[0].name = i18n('trade.stats.accu.buyers', base)
        options.series[1].name = i18n('trade.stats.accu.sellers', base)
        options.title.text = i18n('trade.stats.accu.title', base, quote)
        options.yAxis.title.text = i18n('trade.stats.accu.yAxis', base)
        options.xAxis.title.text = i18n('trade.stats.accu.xAxis', quote, base)

        var $accu = $el.find('.book-accu')
        $accu.highcharts(options)
    })

    var vohlc = api.call('v1/markets/' + market + '/vohlc')

    vohlc.then(vohlcToPrices).done(function(prices) {
        var options = _.clone(require('./price-history.json'), true)
        options.series[0].data = prices
        options.title.text = i18n('trade.stats.price history.title', base, quote)
        options.yAxis.title.text = i18n('trade.stats.price history.yAxis', quote, base)
        options.xAxis.title.text = i18n('trade.stats.price history.xAxis')

        var $prices = $el.find('.price-history')
        $prices.highcharts('StockChart', options)
    })

    vohlc.then(splitVohlc).done(function(data) {
        var options = _.clone(require('./vohlc.json'), true)
        options.series[0].data = data.ohlc
        options.series[1].data = data.volume
        options.title.text = i18n('trade.stats.vohlc.title', base, quote)
        options.yAxis[0].title.text = i18n('trade.stats.vohlc.yAxis.price', quote, base)
        options.yAxis[1].title.text = i18n('trade.stats.vohlc.yAxis.volume', base)
        options.xAxis.title.text = i18n('trade.stats.vohlc.xAxis')

        var $vohlc = $el.find('.vohlc')
        $vohlc.highcharts('StockChart', options)
    })

    return controller
}
