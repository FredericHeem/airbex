var util = require('util')

module.exports = function(app, api) {
    var itemTemplate = require('./item.html')
    , $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }
    , $withdraws = controller.$el.find('.withdraws')

    function itemsChanged(items) {
        $withdraws.html($.map(items, function(item) {
            item.destination = JSON.stringify(item.destination)

            var $item = $(itemTemplate(item))

            $item.find('.process').enabled(item.state == 'requested')
            $item.find('.complete').enabled(item.state == 'processing')
            $item.find('.cancel').enabled(item.state == 'requested' || item.state == 'processing')

            $item.attr('data-id', item.request_id)

            return $item
        }))
    }

    function refresh() {
        api.call('admin/withdraws').done(itemsChanged)
    }

    $el.on('click', '.cancel', function() {
        var id = $(this).closest('.withdraw').attr('data-id')
        , $el = $(this)

        alertify.prompt('Why is the request being cancelled? The user will see this.', function(ok, error) {
            if (!ok) return

            $el.addClass('is-loading')
            .enabled(false)
            .siblings().enabled(false)


            api.call('admin/withdraws/' + id, { error: error || null }, { type: 'DELETE' })
            .done(function() {
                alertify.log(util.format('Order #%s deleted.', id), 'success', 10e3)
                $el.closest('.withdraw').fadeAway()
            })
            .fail(function(xhr) {
                var err = app.errorFromXhr(xhr)
                alert(JSON.stringify(err, null, 4))
                refresh()
            })
        })
    })

    refresh()

    return controller
}
