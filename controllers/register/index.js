module.exports = function(app, api) {
    var controller = {
        $el: $(require('./template.html')())
    }
    , $form = controller.$el.find('form')
    , $email = $form.find('.email')
    , $password = $form.find('.password')

    $form.on('submit', function(e) {
        e.preventDefault()
        api.register($email.val(), $password.val())
        .fail(app.alertXhrError)
        .done(function() {
            window.location.hash = '#dashboard'
        })
    })

    setTimeout(function() {
        $email.focus()
    }, 250)

    return controller
}
