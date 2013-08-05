var header = require('../header')
, itemTemplate = require('./item.html')
, template = require('./index.html')
, format = require('util').format

module.exports = function(userId) {
    var $el = $('<div class="user-orders">').html(template())
    , controller = {
        $el: $el
    }
    , $items = $el.find('.orders')
    , $filters = $el.find('.filters')

    // Insert header
    $el.find('.header-placeholder').replaceWith(header(userId, 'orders').$el)

    function itemsChanged(items) {
        $items.find('tbody').html($.map(items, function(item) {
            return itemTemplate(item)
        }))
    }

    function refresh() {
        var query = {
            userId: userId
        }

        if ($filters.field('remaining').prop('checked')) {
            query.remaining = true
        }

        if ($filters.field('matched').prop('checked')) {
            query.matched = true
        }

        var market = $filters.field('market').val()

        if (market) {
            query.market = market
        }

        api.call('admin/orders', null, { qs: query })
        .done(itemsChanged)
    }

    function populateMarkets(markets) {
        var $market = $filters.field('market')
        $market.html('<option value="">All</option>')
        .append($.map(markets, function(market) {
            return format('<option value="%s">%s</option>',
                market.id, market.id)
        }))
    }

    $filters.find('input, select').on('change', function() {
        refresh()
    })

    $filters.on('submit', function(e) {
        e.preventDefault()
        refresh()
    })

    if (api.markets.value) {
        populateMarkets(api.markets.value)
    } else {
        api.markets().done(populateMarkets)
    }

    refresh()

    return controller
}
