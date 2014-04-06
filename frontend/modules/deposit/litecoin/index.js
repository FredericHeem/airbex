var template = require('./index.html')
, nav = require('../nav')

module.exports = function() {
    var $el = $('<div class=deposit-litecoin>').html(template())
    , controller = {
        $el: $el
    }
    , $address = controller.$el.find('.address')

    api.once('litecoinAddress', function(address) {
        $address.html($('<a href="litecoin:' + address + '">' + address + '</a>'))
    })

    api.litecoinAddress.value || api.litecoinAddress()

    $el.find('.deposit-nav').replaceWith(nav('litecoin').$el)

    return controller
}
