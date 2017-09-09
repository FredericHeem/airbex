var template = require('./index.html')

module.exports = function(market, orderType) {
    var $el = $('<div class="market-order">').html(template({
        base: api.getBaseCurrency(market),
        quote: api.getQuoteCurrency(market),
        market: market
    }))
    , controller = {
        $el: $el
    }
    , bidask;
    if(orderType === 'bid'){
    	bidask = require('./bid')(market)
    } else {
    	bidask = require('./ask')(market)
    }

    $el.find('.askbid').replaceWith(bidask.$el)


    // Set order type (bid or ask)
    function setOrderType(type) {
        $el
        .removeClasses(/^is-order-type/).addClass('is-order-type-' + type)

        // Update navigation pills
        $el.find('[data-order-type="' + type + '"]')
        .parent().addClass('active').siblings().removeClass('active')

        // Focus the input
        $el.find('input:visible:first').focus()
    }

    // Change order type
    $el.on('click', '[data-action="toggle-order-type"]', function(e) {
        e.preventDefault()
        var type = $(this).attr('data-order-type')
        setOrderType(type)
    })

    // Dispose
    $el.on('remove', function() {
    	bidask.$el.triggerHandler('remove')
    })

    controller.setOrderType = setOrderType

    return controller
}
