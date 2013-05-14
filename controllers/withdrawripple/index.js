module.exports = function(app, api) {
    var controller = {
        $el: $(require('./template.html')())
    }
    , $form = controller.$el.find('form')
    , $amount = $form.find('input.amount')
    , $address = $form.find('input.address')
    , $currency = $form.find('input.currency')

    $form.on('submit', function(e) {
        e.preventDefault()
        api.call('v1/ripple/out', {
            amount: $amount.val(),
            address: $address.val(),
            currency: $currency.val()
        })
        .fail(app.alertXhrError)
        .done(function() {
            alert(app.i18n('withdrawripple.confirmation'))
            window.location.hash = '#activities'
        })
    })

    app.section('dashboard')

    return controller
}
