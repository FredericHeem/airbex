var header = require('../header')
, itemTemplate = require('./item.html')
, template = require('./index.html')

module.exports = function(userId) {
    var $el = $('<div class="user-orders">').html(template())
    , controller = {
        $el: $el
    }
    , $items = controller.$el.find('.orders')

    // Insert header
    $el.find('.header-placeholder').replaceWith(header(userId, 'orders').$el)

    function itemsChanged(items) {
        $items.find('tbody').html($.map(items, function(item) {
            return itemTemplate(item)
        }))
    }

    function refresh() {
        api.call('admin/orders', null, { qs: { user: userId } })
        .done(itemsChanged)
    }

    refresh()

    return controller
}
