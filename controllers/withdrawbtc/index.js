module.exports = function(app, api) {
    var controller = {
        $el: $(require('./template.html')())
    }
    , $form = controller.$el.find('form')
    , $amount = $form.find('input.amount')
    , $address = $form.find('input.address')

    $form.on('submit', function(e) {
        e.preventDefault()
        api.call('v1/btc/out', {
            amount: $amount.val(),
            address: $address.val()
        })
        .fail(app.alertXhrError)
        .done(function() {
            alert(app.i18n('withdrawbtc.confirmation'))
            window.location.hash = '#activities'
        })
    })

    app.section('dashboard')

    return controller
}
