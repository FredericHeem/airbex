module.exports = function(api) {
    var controller = {
        $el: $(require('./template.html')())
    }
    , $form = controller.$el.filter('form')
    , $email = $form.find('input.email')
    , $password = $form.find('input.password')

    $form.on('submit', function(e) {
        e.preventDefault()
        api.login($email.val(), $password.val())
        .then(function() {
            console.error('TODO redirect')
        }, function(err) {
            window.location.hash = '#balances'
        }).done()
    })

    return controller
}
