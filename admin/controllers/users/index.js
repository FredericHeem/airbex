var format = require('util').format

module.exports = function(query, skip) {
    // Assign defaults
    query || (query = '')
    skip || (skip = 0)

    var itemTemplate = require('./item.html')
    , $el = $(require('./template.html')({
        query: query
    }))
    , ctrl = {
        $el: $el
    }

    // Navigation
    $el.find('.nav a[href="#users"]').parent().addClass('active')

    // Submit search
    $el.on('submit', 'form', function(e) {
        e.preventDefault()
        var val = $el.field('query').val()
        if (!val.length) return
        router.go('users?query=' + val)
    })

    $el.find('.query').focus().focusSoon()

    if (!query) return ctrl

    // Search
    api.call('admin/users', null, {
        qs: {
            all: query,
            skip: skip
        }
    })
    .fail(errors.alertFromXhr)
    .done(function(res) {
        // Add items
        $el.find('.users').html($.map(res.users, function(item) {
            var $item = $(itemTemplate(item))
            $item.attr('data-id', item.user_id)
            return $item
        }))

        // Toggle pagers
        $el
        .toggleClass('has-page-after', skip + res.users.length < res.count)
        .toggleClass('has-page-before', !!skip)

        // Pager next
        $el.on('click', '.pager .next a', function(e) {
            e.preventDefault()
            skip = skip + res.users.length
            router.go(format('users?query=%s&skip=%d', query, skip))
        })

        // Pager previous
        $el.on('click', '.pager .previous a', function(e) {
            e.preventDefault()
            var prev = Math.max(0, skip - res.limit)
            skip = prev > 0 ? prev : 0
            router.go(format('users?query=%s&skip=%d', query, skip))
        })
    })

    return ctrl
}
