module.exports = function() {
    var $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }
    , $summary = controller.$el.find('.account-summary')

    function userUpdated(user) {
        $summary.find('.email').html(user.email)

        api.call('admin/withdraws?activeOnly=1')
        .done(function(withdraws) {
            $el.find('.active-withdraw-count').html(withdraws.length)
        })
    }

    function documentUpdated() {
        api.call('admin/documents/users')
        .done(function(documents) {
            $el.find('.active-document-count').html(documents.length)
        })
    }
    
    documentUpdated();
    
    api.on('user', userUpdated)

    $el.on('click', '[data-action="sign-out"]', function(e) {
        e.preventDefault()
        api.logout()
    })

    $el.on('remove', function() {
        api.off('user', userUpdated)
    })

    return controller
}
