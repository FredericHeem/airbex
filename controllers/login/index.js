module.exports = function(app, api, after) {
    var controller = {
        $el: $(require('./template.html')())
    }
    , $form = controller.$el.find('form')
    , $email = $form.find('.email')
    , $password = $form.find('.password')

    $form.on('submit', function(e) {
        e.preventDefault()
        api.login($email.val(), $password.val())
        .fail(function(err) {
            var error = app.errorFromXhr(err)

            if (error.name == 'UnknownApiKey') {
                alert(app.i18n('login.wrong username or password'))
                return
            }

            app.alertXhrError(err)
        })
        .done(function() {
            window.location.hash = '#' + (after || 'dashboard')
        })
    })

    setTimeout(function() {
        $email.focus()
    }, 250)

    return controller
}
