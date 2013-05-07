module.exports = function(app, api) {
    var itemTemplate = require('./item.html')
    , controller = {
        $el: $(require('./template.html')())
    }
    , $items = controller.$el.find('.items')

    function itemsChanged(items) {
        $items.append($.map(items, function(item) {
            var $el = $(itemTemplate(item))
            $el.attr('data-id', item.id)
            return $el
        }))
    }

    function refresh() {
        api.call('orders').done(itemsChanged)
    }

    $items.on('click', 'button.cancel', function(e) {
        e.preventDefault()
        var $item = $(e.target).closest('.item')

        api.call('orders/' + $item.attr('data-id'), null, { type: 'DELETE' })
        .fail(app.alertXhrError)
        .done(function() {
            api.balances()
            $item.remove()
        })
    })

    refresh()

    app.section('orders')

    return controller
}
