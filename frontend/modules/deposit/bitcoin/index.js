var template = require('./index.html')
, nav = require('../nav')

module.exports = function() {
    var $el = $('<div class=deposit-bitcoin>').html(template())
    , controller = {
        $el: $el
    }
    , $address = controller.$el.find('.address')

    api.once('bitcoinAddress', function(address) {
        $address.html($('<a href="bitcoin:' + address + '">' + address + '</a>'))
    })

    api.bitcoinAddress.value || api.bitcoinAddress()

    $el.find('.deposit-nav').replaceWith(nav('bitcoin').$el)

    return controller
}
