module.exports = function(app, api) {
    var controller = {
        $el: $(require('./template.html')())
    }
    , $address = controller.$el.find('.address')

    app.bitcoinAddress().done(function(address) {
        $address.html($('<a href="bitcoin:' + address + '">' + address + '</a>'))
    })

    app.section('dashboard')

    return controller
}
