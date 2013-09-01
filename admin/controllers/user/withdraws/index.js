var withdraws = require('../../shared/withdraws')
, header = require('../header')

module.exports = function(userId) {
    var opts = { userId: userId }
    , controller = withdraws(opts)

    // Insert header
    controller.$el.find('.header-placeholder')
    .replaceWith(header(userId, 'withdraw-requests').$el)

    controller.$el
    .addClass('container')
    .addClass('is-single-user')

    controller.init()

    return controller
}
