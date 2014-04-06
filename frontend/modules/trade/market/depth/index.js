var priceTemplate = require('./price.html')
, template = require('./index.html')
, uptodate = require('../../../../helpers/uptodate')

module.exports = function(id) {
    var base = id.substr(0, 3)
    , quote = id.substr(3)
    , $el = $('<div class="depth">').html(template({
        id: id,
        base_currency: base,
        quote_currency: quote
    }))
    , controller = {
        $el: $el
    }
    , $depth = controller.$el.find('.depth')
    , maxLevels = 1000

    function onDepth(depth) {
        // Bids (sorted and capped)
        $depth.find('.bids-depth')
        .find('tbody').html($.map(depth.bids.slice(0, maxLevels), function(level) {
            return priceTemplate({
                price: level[0],
                volume: level[1]
            })
        }))

        // Asks
        $depth.find('.asks-depth')
        .find('tbody').html($.map(depth.asks.slice(0, maxLevels), function(level) {
            return priceTemplate({
                price: level[0],
                volume: level[1]
            })
        }))
    }

    // Subscribe to depth, show current if any, and refresh it now
    api.on('depth:' + id, onDepth)
    api.depth[id] && onDepth(api.depth[id])

    $el.on('remove', function() {
        refresh.stop()
        api.off('depth:' + id, onDepth)
    })

    var refresh = uptodate(api.depth.bind(api, id), null, {
        now: !api.depth[id]
    })

    return controller
}
