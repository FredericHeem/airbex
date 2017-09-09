var priceTemplate = require('./price.html')
, template = require('./index.html')
, num = require('num')
, debug = require('../../../../helpers/debug')('depth')

module.exports = function(id) {
    var base = api.getBaseCurrency(id)
    , quote = api.getQuoteCurrency(id)
    , $el = $('<div class="depth">').html(template({
        id: id,
        base_currency: base,
        quote_currency: quote
    }))
    , controller = {
        $el: $el
    }
    , $depth = controller.$el.find('.depth')
    , maxLevels = 15
    , quote_scale_diplay = api.markets[id].quote_scale_diplay
    
    function depthLevelHtml(quotes){
        var cumVolume = num(0);
        return $.map(quotes, function(level) {
            cumVolume = cumVolume.add(num(level[1]))
            return priceTemplate({
                price: level[0],
                price_scale: quote_scale_diplay,
                volume: level[1],
                volume_scale:numbers.getCurrencyOption(base).scale_display,
                cumVolume:cumVolume.toString()
            })
        })
    }
    
    function onDepth(depth) {
        // Bids (sorted and capped)
        debug("onDepth");
        
        $depth.find('.bids-depth')
        .find('tbody').html(depthLevelHtml(depth.bids.slice(0, maxLevels)))

        // Asks
        $depth.find('.asks-depth')
         .find('tbody').html(depthLevelHtml(depth.asks.slice(0, maxLevels)))
    }

    function onDepthWebSocket(result) {
        debug("onDepthWebSocket for %s", result.data.marketId)
        //onDepth(result.data)
        api.trigger('depth:' + result.data.marketId, result.data)
    }
    
    if(!api.depth[id]) api.depth(id);
    
    api.onWebSocket('/v1/markets/' + id + '/depth', onDepthWebSocket);
    api.on('depth:' + id, onDepth)
    api.depth[id] && onDepth(api.depth[id])

    $el.on('remove', function() {
        api.offWebSocket('/v1/markets/' + id + '/depth', onDepthWebSocket);
        api.off('depth:' + id, onDepth)
    })

    return controller
}
