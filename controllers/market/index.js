var num = require('num')
, util = require('util')
, _ = require('lodash')

module.exports = function(app, api, id) {
    var priceTemplate = require('./price.html')
    , base = id.substr(0, 3)
    , quote = id.substr(3)
    , controller = {
        $el: $(require('./template.html')({
            id: id,
            type: 'bid',
            price: '',
            amount: '',
            base_currency: base,
            quote_currency: quote
        }))
    }
    , $depth = controller.$el.find('.depth')
    , $buy = controller.$el.find('.buy')
    , $buyPrice = $buy.find('*[name="price"]')
    , $buyAmount = $buy.find('*[name="amount"]')
    , $buySummary = $buy.find('.summary')
    , $sell = controller.$el.find('.sell')
    , $sellPrice = $sell.find('*[name="price"]')
    , $sellAmount = $sell.find('*[name="amount"]')
    , $sellSummary = $sell.find('.summary')

    function depthChanged(depth) {
        var combined = []

        depth.bids.forEach(function(x) {
            combined.push({
                type: 'bid',
                price: x[0],
                volume: x[1]
            })
        })

        depth.asks.forEach(function(x) {
            combined.push({
                type: 'ask',
                price: x[0],
                volume: x[1]
            })
        })

        combined.sort(function(a, b) {
            return a.price - b.price
        })

        $depth.find('tbody').html($.map(combined, function(item) {
            return priceTemplate(item)
        }))

        var ask, bid

        if (!$buyPrice.hasClass('is-changed')) {
            ask = _.find(combined, { type: 'ask'})
            if (ask) {
                $buyPrice.val(ask.price)
            }
        }

        if (!$sellPrice.hasClass('is-changed')) {
            bid = _.last(_.where(combined, { type: 'bid'}))
            if (bid) {
                $sellPrice.val(bid.price)
            }
        }
    }

    function refreshDepth() {
        api.call('v1/markets/' + id + '/depth')
        .fail(app.alertXhrError)
        .done(depthChanged)
    }

    function updateBuySummary() {
        var total = num($buyPrice.val()).mul($buyAmount.val())
        $buySummary.html([
            'You are buying',
            $buyAmount.val(),
            base,
            'for',
            total.toString(),
            quote
        ].join(' '))
    }

    function updateSellSummary() {
        var total = num($sellPrice.val()).mul($sellAmount.val())
        $sellSummary.html([
            'You are selling',
            $sellAmount.val(),
            base,
            'for',
            total.toString(),
            quote
        ].join(' '))
    }

    $buy.on('submit', function(e) {
        e.preventDefault()
        api.call('v1/orders', {
            market: id,
            type: 'bid',
            price: $buyPrice.val(),
            amount: $buyAmount.val()
        })
        .fail(app.alertXhrError)
        .done(function(order) {
            api.balances()
            alert('Order ' + order.id + ' placed')
            //window.location.hash = '#orders'
        })
    })

    $sell.on('submit', function(e) {
        e.preventDefault()
        api.call('v1/orders', {
            market: id,
            type: 'ask',
            price: $sellPrice.val(),
            amount: $sellAmount.val()
        }).done(function(order) {
            api.balances()
            alert('Order ' + order.id + ' placed')
            //window.location.hash = '#orders'
        })
    })

    $buyPrice.on('keyup change', function(e) {
        $buyPrice.addClass('is-changed')
        updateBuySummary()
    })

    $buyAmount.on('keyup change', function(e) {
        updateBuySummary()
    })

    $sellPrice.on('keyup change', function(e) {
        $sellPrice.addClass('is-changed')
        updateSellSummary()
    })

    $sellAmount.on('keyup change', function(e) {
        updateSellSummary()
    })

    refreshDepth()

    app.section('markets')

    return controller
}
