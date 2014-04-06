var template = require('./index.html')
, _ = require('lodash')

module.exports = function() {
    var $el = $('<div class=auth-norwaydeposit>').html(template(_.extend(api.user, {
        messageToRecipient: api.user.tag
    })))
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
