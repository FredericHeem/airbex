var template = require('./template.html')

module.exports = function(userId, tab) {
    var $el = $('<div class="admin-user-header">').html(template({
        userId: userId
    }))
    , controller = {
        $el: $el
    }

    if (tab) {
        $el.find('.nav .' + tab).addClass('active')
    }

    return controller
}
