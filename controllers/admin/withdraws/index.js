var util = require('util')

module.exports = function(app, api) {
    var itemTemplate = require('./item.html')
    , $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }
    , $withdraws = controller.$el.find('.withdraws')

    $el.filter('.nav-container').html(require('../nav.html')())

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


            api.call('admin/withdraws/' + id, { state: 'cancelled', error: error || null }, { type: 'PATCH' })
            .done(function() {
                alertify.log(util.format('Order #%s cancelled.', id), 'success', 30e3)
                $el.closest('.withdraw').fadeAway()
            })
            .fail(function(xhr) {
                var err = app.errorFromXhr(xhr)
                alert(JSON.stringify(err, null, 4))
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
            alertify.log(util.format('Order #%s is now processing.', id), 'success', 30e3)
            refresh()
        })
        .fail(function(xhr) {
            var err = app.errorFromXhr(xhr)
            alert(JSON.stringify(err, null, 4))
            refresh()
        })
    })

    $el.on('click', '.complete', function() {
        var id = $(this).closest('.withdraw').attr('data-id')
        , $el = $(this)

        $el.addClass('is-loading')
        .enabled(false)
        .siblings().enabled(false)

        api.call('admin/withdraws/' + id, { state: 'completed' }, { type: 'PATCH' })
        .done(function() {
            alertify.log(util.format('Order #%s marked as completed.', id), 'success', 30e3)
            $el.closest('.withdraw').fadeAway()
        })
        .fail(function(xhr) {
            var err = app.errorFromXhr(xhr)
            alert(JSON.stringify(err, null, 4))
            refresh()
        })
    })

    refresh()

    app.section('admin')
    $el.find('.nav a[href="#admin/withdraws"]').parent().addClass('active')

    return controller
}
