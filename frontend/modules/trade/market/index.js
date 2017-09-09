var template = require('./index.html')

module.exports = function(market, mode, type) {
    var $el = $('<div class="trade-market">').html(template({
        base:  api.getBaseCurrency(market),
        quote:  api.getQuoteCurrency(market),
        id: market,
        mode: mode == 'limit' ? 'advanced' : 'instant',
        type: type == 'ask' ? 'sell' : 'buy'
    }))
    , controller = {
        $el: $el
    }
    , tradeForm
    , depth = require('./depth')(market)
    , stats = require('../stats')(market)

    //Update currency in top nav
    api.trigger('market', market)
    
    api.fetchMarkets()
    
    if(type === "ask"){
        if(mode === 'market'){
            tradeForm = require('./marketorder')(market, 'ask')
        } else {
            tradeForm = require('./limitorder')(market, 'ask')
        }
    } else {
        if(mode === 'market'){
            tradeForm = require('./marketorder')(market, 'bid')
        } else {
            tradeForm = require('./limitorder')(market, 'bid')
        }    	
    }
    
    api.depth(market);
    
    $el.find('#trade-form').replaceWith(tradeForm.$el)
    $el.find('.depth-container').html(depth.$el)
    $el.find('.stats-container').html(stats.$el)

    $el.find('#trade-buy').toggleClass('active', type == 'bid')
    $el.find('#trade-sell').toggleClass('active', type == 'ask')
    $el.find('#trade-instant').toggleClass('active', mode == 'market')
    $el.find('#trade-advanced').toggleClass('active', mode == 'limit')
    
    // Set order mode (market or limit)
    function setOrderMode(mode) {
        $el.removeClasses(/^is-order-mode/).addClass('is-order-mode-' + mode)
        $el.find('[data-order-mode="' + mode + '"]')
        .parent().addClass('active').siblings().removeClass('active')

        $el.find('input:visible:first').focus()
    }


    $el.on('remove', function() {
    	tradeForm.$el.triggerHandler('remove')
        depth.$el.triggerHandler('remove')
    })


    return controller
}
