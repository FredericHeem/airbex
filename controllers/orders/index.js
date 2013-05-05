module.exports = function(api) {
    var itemTemplate = require('./item.html')
    , controller = {
        $el: $(require('./template.html')())
    }
    , $items = controller.$el.find('tbody')

    function itemsChanged(items) {
        $items.append($.map(items, function(item) {
            var $el = $(itemTemplate(item))
            $el.data('item', item)
            return $el
        }))

        console.log($items.find('button.cancel'))
    }

    function refresh() {
        api.call('orders').then(itemsChanged).done()
    }

    $items.on('click', 'button.cancel', function(e) {
        e.preventDefault()
        var $item = $(e.target).parents('tr:first')
        , item = $item.data('item')

        api.call('orders/' + item.id, null, { method: 'DELETE' })
        .then(function() {
            $item.remove()
        })
    })

    window.$temp = $items.find('button.cancel')

    refresh()

    return controller
}
