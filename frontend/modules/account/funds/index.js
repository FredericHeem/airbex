var template = require('./index.html')
, itemTemplate = require('./item.html')
, debug = require('../../../helpers/debug')('funds');

module.exports = function() {
    var $el = $('<div class=account-funds>').html(template())
    , controller = {
        $el: $el
    }
    
    debug("");
    
    function balancesFunds(items) {
        $el.find('.balances tbody').html($.map(items, function(x) {
            return itemTemplate(x)
        }))
    }

    api.on('balances', balancesFunds)
    
    api.balances && balancesFunds(api.balances)

    $el.on('remove', function() {
        api.off('balances', balancesFunds)
    })

    $el.toggleClass('has-two-factor-enabled', !!api.user.twoFactor)

    return controller
}
