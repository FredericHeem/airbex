var withdraws = require('../../withdraws')
, header = require('../header')

module.exports = function(userId) {
    var url = 'admin/withdraws?user_id=' + userId
    , controller = withdraws(url)

    // Insert header
    controller.$el.find('.header-placeholder')
    .replaceWith(header(userId, 'withdraw-requests').$el)

    controller.$el
    .addClass('container')
    .addClass('is-single-user')

    controller.init()

    return controller
}
