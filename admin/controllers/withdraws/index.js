module.exports = function() {
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

            $item.find('.process')
            .enabled(item.state == 'requested')

            $item.find('.complete')
            .enabled(item.state == 'processing')

            $item.find('.cancel')
            .enabled(item.state == 'requested' || item.state == 'processing')

            $item.attr('data-id', item.request_id)

            return $item
        }))
    }

    function refresh() {
        api.call('admin/withdraws')
        .fail(errors.alertFromXhr)
        .done(itemsChanged)
    }

    $el.on('click', '.cancel', function() {
        var id = $(this).closest('.withdraw').attr('data-id')
        , $el = $(this)
        , message = 'Why is the request being cancelled? The user will see this.'

        alertify.prompt(message, function(ok, error) {
            if (!ok) return

            $el.addClass('is-loading')
            .enabled(false)
            .siblings().enabled(false)

            var url = 'admin/withdraws/' + id
            , data = { state: 'cancelled', error: error || null }

            api.call(url, data, { type: 'PATCH' })
            .done(function() {
                $el.closest('.withdraw').fadeAway()
            })
            .fail(function(xhr) {
                errors.alertFromXhr(xhr)
                refresh()
            })
        })
    })

    $el.on('click', '.process', function() {
        var id = $(this).closest('.withdraw').attr('data-id')
        , $el = $(this)

        $el.addClass('is-loading')
        .enabled(false)
        .siblings().enabled(false)


        api.call('admin/withdraws/' + id, { state: 'processing' }, { type: 'PATCH' })
        .done(function() {
            refresh()
        })
        .fail(function(xhr) {
            errors.alertFromXhr(xhr)
            refresh()
        })
    })

    $el.on('click', '.complete', function() {
        var id = $(this).closest('.withdraw').attr('data-id')
        , $el = $(this)

        $el.addClass('is-loading')
        .enabled(false)
        .siblings().enabled(false)

        var url = 'admin/withdraws/' + id

        api.call(url, { state: 'completed' }, { type: 'PATCH' })
        .done(function() {
            $el.closest('.withdraw').fadeAway()
        })
        .fail(function(xhr) {
            errors.alertFromXhr(xhr)
            refresh()
        })
    })

    refresh()

    $el.find('.nav a[href="#withdraws"]').parent().addClass('active')

    return controller
}
