var util = require('util')

module.exports = function(app, api) {
    var $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }

    $el.filter('.nav-container').html(require('../nav.html')())

    $el.on('submit', 'form', function(e) {
        e.preventDefault()

        var $el = $(this)

        $el.addClass('is-loading').enabled(false)

        var body = {
            user_id: $el.find('.user input').val(),
            amount: $el.find('.amount input').val(),
            currency_id: $el.find('.currency input').val()
        }

        api.call('admin/credit', body, { type: 'POST' })
        .always(function() {
            $el.removeClass('is-loading').enabled(true)
        })
        .done(function() {
            alertify.log(util.format(
                'User #%s credited with %s %s',
                body.user_id,
                body.amount,
                body.currency_id), 'success', 30e3)

            $el.find('input').val('')
            $el.find('.user input').focus()
        })
        .fail(function(xhr) {
            var err = app.errorFromXhr(xhr)
            alert(JSON.stringify(err, null, 4))
        })
    })

    app.section('admin')
    $el.find('.nav a[href="#admin/credit"]').parent().addClass('active')

    return controller
}
