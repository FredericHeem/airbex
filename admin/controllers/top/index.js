module.exports = function() {
    var $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }
    , $summary = controller.$el.find('.account-summary')

    api.on('user', function(user) {
        $summary.find('.email').html(user.email)
    })

    controller.destroy = function() {
    }

    return controller
}
