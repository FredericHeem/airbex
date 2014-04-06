var template = require('./index.html')

module.exports = function() {
    var $el = $('<div class=auth-cip>').html(template(api.user))
    , controller = {
        $el: $el
    }

    $el.on('click', '[data-action="continue"]', function(e) {
        e.preventDefault()
        $(this).loading(true)

        setTimeout(function() {
            $el.addClass('is-finished')
        }, 1.5e3)
    })

    return controller
}
