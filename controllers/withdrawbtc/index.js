module.exports = function(app, api) {
    var controller = {
        $el: $(require('./template.html')())
    }
    , $form = controller.$el.find('form')
    , $amount = $form.find('input.amount')
    , $address = $form.find('input.address')

    $form.on('submit', function(e) {
        e.preventDefault()
        api.call('withdraw/btc', {
            amount: $amount.val(),
            address: $address.val()
        })
        .fail(app.alertXhrError)
        .done(function() {
            alert('Withdraw requested')
            window.location.hash = '#activities'
        })
    })

    app.section('dashboard')

    return controller
}
