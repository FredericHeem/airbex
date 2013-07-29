var withdraws = require('../shared/withdraws')

module.exports = function() {
    var controller = withdraws('admin/withdraws?activeOnly=1')
    controller.$el.addClass('container')
    controller.init()
    return controller
}
