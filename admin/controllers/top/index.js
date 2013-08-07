module.exports = function() {
    var $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }
    , $summary = controller.$el.find('.account-summary')

    api.on('user', function(user) {
        $summary.find('.email').html(user.email)

        api.call('admin/withdraws?activeOnly=1')
        .done(function(withdraws) {
            $el.find('.active-withdraw-count').html(withdraws.length)
        })
    })

    controller.destroy = function() {
    }

    return controller
}
