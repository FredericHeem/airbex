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
            side: 'bid',
            price: '',
            volume: '',
            base_currency: base,
            quote_currency: quote
        }))
    }
    , $depth = controller.$el.find('.depth')
    , $buy = controller.$el.find('.buy')
    , $buyPrice = $buy.find('*[name="price"]')
    , $buyVolume = $buy.find('*[name="volume"]')
    , $buySummary = $buy.find('.summary')
    , $sell = controller.$el.find('.sell')
    , $sellPrice = $sell.find('*[name="price"]')
    , $sellVolume = $sell.find('*[name="volume"]')
    , $sellSummary = $sell.find('.summary')

    function flash($e) {
        $e.stop()
        .css({'background-color': '#FFFF9C' })

        setTimeout(function() {
            $e.stop()
            .css({'background-color': '' })
        }, 750)
    }

    function depthChanged(depth) {
        depth.sort(function(a, b) {
            return a.price - b.price
        })

        $depth.find('tbody').html($.map(depth, function(item) {
            return priceTemplate(item)
        }))

        var ask, bid

        if (!$buyPrice.hasClass('is-changed')) {
            ask = _.find(depth, { side: 'ask'})
            if (ask) {
                if ($buyPrice.val().length && $buyPrice.val() != ask.price) {
                    flash($buyPrice)
                }
                $buyPrice.val(ask.price)
            }
        }

        if (!$sellPrice.hasClass('is-changed')) {
            bid = _.last(_.where(depth, { side: 'bid'}))
            if (bid) {
                if ($sellPrice.val().length && $sellPrice.val() != bid.price) {
                    flash($sellPrice)
                }
                $sellPrice.val(bid.price)
            }
        }
    }

    function refreshDepth() {
        api.call('markets/' + id + '/depth')
        .fail(app.alertXhrError)
        .done(depthChanged)
    }

    function updateBuySummary() {
        var total = num($buyPrice.val()).mul($buyVolume.val())
        $buySummary.html([
            'You are buying',
            $buyVolume.val(),
            base,
            'for',
            total.toString(),
            quote
        ].join(' '))
    }

    function updateSellSummary() {
        var total = num($sellPrice.val()).mul($sellVolume.val())
        $sellSummary.html([
            'You are selling',
            $sellVolume.val(),
            base,
            'for',
            total.toString(),
            quote
        ].join(' '))
    }

    $buy.on('submit', function(e) {
        e.preventDefault()
        api.call('orders', {
            market: id,
            side: 'bid',
            price: $buyPrice.val(),
            volume: $buyVolume.val()
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
        api.call('orders', {
            market: id,
            side: 'ask',
            price: $sellPrice.val(),
            volume: $sellVolume.val()
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

    $buyVolume.on('keyup change', function(e) {
        updateBuySummary()
    })

    $sellPrice.on('keyup change', function(e) {
        $sellPrice.addClass('is-changed')
        updateSellSummary()
    })

    $sellVolume.on('keyup change', function(e) {
        updateSellSummary()
    })

    refreshDepth()

    app.section('markets')

    return controller
}
