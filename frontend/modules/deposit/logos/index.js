var template = require('./index.html')
, nav = require('../nav')

module.exports = function() {
    var $el = $('<div class=deposit-logos>').html(template())
    , controller = {
        $el: $el
    }
    , $address = controller.$el.find('.address')

    api.once('logosAddress', function(address) {
        $address.html($('<a href="logos:' + address + '">' + address + '</a>'))
    })

    api.logosAddress.value || api.logosAddress()

    $el.find('.deposit-nav').replaceWith(nav('logos').$el)

    return controller
}
