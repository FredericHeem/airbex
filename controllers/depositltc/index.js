module.exports = function(app, api) {
    var controller = {
        $el: $(require('./template.html')())
    }
    , $address = controller.$el.find('.address')

    app.litecoinAddress().done(function(address) {
        $address.html($('<a href="litecoin:' + address + '">' + address + '</a>'))
    })

    app.section('dashboard')

    return controller
}
