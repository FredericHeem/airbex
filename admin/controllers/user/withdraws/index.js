var withdraws = require('../../shared/withdraws')
, header = require('../header')

module.exports = function(userId) {
    var opts = { user_id: userId }
    , controller = withdraws(opts)

    controller.$el
    .addClass('container')
    .addClass('is-single-user')

    // Insert header
    controller.$el.prepend(header(userId, 'withdraw-requests').$el)

    controller.init()

    return controller
}
