var template = require('./index.html')
, currencyTemplate = require('./currency.html')

module.exports = function() {
    var $el = $(template(window.config))
    , controller = {
        $el: $el
    }

    function balances(items) {
        $el.find('.currency-view').html($.map(items, function(x) {
            return currencyTemplate(x)
        }))
    }

    api.on('balances', balances)
    api.balances && api.balances.value && balances(api.balances.value)

    $el.on('remove', function() {
        api.off('balances', balances)
    })
    
    return controller
}