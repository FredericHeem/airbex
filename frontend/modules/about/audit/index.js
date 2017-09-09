var template = require('./index.html')
, debug = require('debug')('audit')
, itemTemplate = require('./item.html')

module.exports = function(currency) {
    var $el = $(template())
    , controller = {
        $el: $el
    }

    debug('audit ', currency);

    function onCurrencies(currencies) {
        $el.find('.currencies').html($.map(currencies, function(currency) {
            if(currency.fiat == false){
                return itemTemplate({currency: currency.id})
            }
        }))
    }

    api.on('currencies', onCurrencies)
    api.currencies.values && onCurrencies(api.currencies.value)
    
    return controller
}