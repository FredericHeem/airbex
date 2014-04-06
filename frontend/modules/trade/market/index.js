var template = require('./index.html')
, nav = require('../nav')

module.exports = function(market, mode, type) {
    var $el = $('<div class="trade-market">').html(template({
        base: market.substr(0, 3),
        quote: market.substr(3, 3),
        id: market,
        mode: mode == 'limit' ? 'advanced' : 'instant',
        type: type == 'ask' ? 'sell' : 'buy'
    }))
    , controller = {
        $el: $el
    }
    , marketOrder = require('./marketorder')(market)
    , limitOrder = require('./limitorder')(market)
    , depth = require('./depth')(market)

    $el.find('.market-order').replaceWith(marketOrder.$el)
    $el.find('.limit-order').replaceWith(limitOrder.$el)
    $el.find('.depth-container').html(depth.$el)

    $el.find('.order-modes .instant').toggleClass('active', mode == 'market')
    $el.find('.order-modes .advanced').toggleClass('active', mode == 'limit')

    // Set order mode (market or limit)
    function setOrderMode(mode) {
        $el.removeClasses(/^is-order-mode/).addClass('is-order-mode-' + mode)
        $el.find('[data-order-mode="' + mode + '"]')
        .parent().addClass('active').siblings().removeClass('active')

        $el.find('input:visible:first').focus()
    }

    setOrderMode(mode)

    var subModule = mode == 'limit' ? limitOrder : marketOrder
    subModule.setOrderType(type)

    $el.on('remove', function() {
        marketOrder.$el.triggerHandler('remove')
        limitOrder.$el.triggerHandler('remove')
        depth.$el.triggerHandler('remove')
    })

    $el.find('.trade-nav').replaceWith(nav(market, mode, type).$el)

    return controller
}
