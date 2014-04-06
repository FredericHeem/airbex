var template = require('./index.html')
, itemTemplate = require('./item.html')
, _ = require('lodash')

module.exports = function(opts) {
    var $el = $('<div class="withdraws">').html(template())
    , controller = {
        $el: $el
    }
    , $items = controller.$el.find('tbody')
    , lastItems

    function itemsChanged(items) {
        $items.html($.map(items, function(item) {
            var $item = $(itemTemplate(item))
            $item.addClass('is-' + item.state)
            .attr('data-id', item.id)

            return $item
        }))

        lastItems = items
    }

    function refresh() {
        api.call('admin/withdraws', null, { qs: opts })
        .then(function(withdraws) {
            return $.when.apply($, _.map(withdraws, function(withdraw) {
                return api.call('admin/users/' + withdraw.user)
                .then(function(user) {
                    withdraw.user = user
                })
            }))
            .then(function() {
                return withdraws
            })
        })
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

    $el.on('click', '.complete', function(e) {
        e.preventDefault()
        var id = +$(this).closest('.withdraw').attr('data-id')

        var item = _.find(lastItems, { id: id })

        var modal = require('./confirm')(item)

        $('body').append(modal.$el)

        modal.$el.on('hidden', '.modal', function() {
            router.reload()
        })
    })

    controller.init = function() {
        refresh()
    }

    return controller
}
