var header = require('../header')

module.exports = function(userId) {
    var itemTemplate = require('./item.html')
    , $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }
    , $items = controller.$el.find('.withdraw-requests')

    // Insert header
    $el.find('.header-placeholder').replaceWith(header(userId, 'withdraw-requests').$el)

    function itemsChanged(items) {
        $items.html($.map(items, function(item) {
            return itemTemplate(item)
        }))
    }

    function refresh() {
        api.call('admin/users/' + userId + '/withdrawRequests').done(itemsChanged)
    }

    $el.on('click', '.withdraw-requests .withdraw-request .cancel', function(e) {
        e.preventDefault()

        var id = $(this).closest('.withdraw-request').attr('data-id')
        , $btn = $(this)

        var msg = 'Why is the request being cancelled? The user will see this.'

        alertify.prompt(msg, function(ok, error) {
            if (!ok) return

            $btn.addClass('is-loading')
            .enabled(false)
            .siblings().enabled(false)

            var url = 'admin/withdraws/' + id
            , data = { state: 'cancelled', error: error || null }

            api.call(url, data, { type: 'PATCH' })
            .fail(function(xhr) {
                errors.alertFromXhr(xhr)
                refresh()
            })
            .done(function() {
                refresh()
            })
        })
    })

    refresh()

    return controller
}
