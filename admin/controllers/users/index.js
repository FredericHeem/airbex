module.exports = function() {
    var itemTemplate = require('./item.html')
    , $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }
    , $items = controller.$el.find('.users')
    , $form = $el.find('.search-form')

    function itemsChanged(items) {
        $items.html($.map(items, function(item) {
            var $item = $(itemTemplate(item))
            $item.attr('data-id', item.user_id)
            return $item
        }))
    }

    function refresh(query) {
        $form.addClass('is-loading')

        api.call('admin/users', null, { qs: query })
        .fail(errors.alertFromXhr)
        .always(function() {
            $form.removeClass('is-loading')
        })
        .done(itemsChanged)
    }

    $form.on('submit', function(e) {
        function parseField(val) {
            val = val.replace(/^\s+|\s+$/g, '')
            return val.length ? val : null
        }

        e.preventDefault()

        refresh({
            all: parseField($form.find('.query').val())
        })
    })

    $el.find('.nav a[href="#users"]').parent().addClass('active')

    $el.find('.query').focusSoon()

    return controller
}
