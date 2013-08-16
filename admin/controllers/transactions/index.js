var template = require('./index.html')

module.exports = function(userId) {
    var itemTemplate = require('./item.html')
    , $el = $('<div class=admin-transactions>').html(template())
    , controller = {
        $el: $el
    }
    , $items = $el.find('.transactions')
    , $form = $el.find('.search-form')

    function itemsChanged(query, items) {
        $items.find('tbody').html($.map(items, function(item) {
            item.raw = JSON.stringify(item)
            item.query = query
            var $item = $(itemTemplate(item))
            $item.attr('data-id', item.id)
            return $item
        }))
    }

    function refresh(query) {
        $form.addClass('is-loading')

        api.call('admin/transactions', query)
        .fail(errors.alertFromXhr)
        .always(function() {
            $form.removeClass('is-loading')
        })
        .done(itemsChanged.bind(this, query))
    }

    function search() {
        var q = {
            sort: {
                timestamp: 'desc'
            }
        }

        var userId = $el.field('userId').val()

        if (userId) {
            q.userId = +userId
        }

        refresh(q)
    }

    $form.on('submit', function(e) {
        e.preventDefault()
        search()
    })

    if (userId) {
        $el.field('userId').val(userId)
    }

    search()

    $el.find('.nav a[href="#transactions"]').parent().addClass('active')

    $el.find('.query').focusSoon()

    return controller
}
