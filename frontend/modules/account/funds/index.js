var template = require('./index.html')
, nav = require('../nav')
, itemTemplate = require('./item.html')

module.exports = function() {
    var $el = $('<div class=account-funds>').html(template())
    , controller = {
        $el: $el
    }

    function balances(items) {
        $el.find('.balances tbody').html($.map(items, function(x) {
            return itemTemplate(x)
        }))
    }

    api.on('balances', balances)
    api.balances.value && balances(api.balances.value)

    $el.on('remove', function() {
        api.off('balances', balances)
    })

    $el.find('.account-nav').replaceWith(nav('funds').$el)

    $el.toggleClass('has-two-factor-enabled', !!api.user.twoFactor)

    return controller
}
