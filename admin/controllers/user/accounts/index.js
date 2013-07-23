var header = require('../header')

module.exports = function(userId) {
    var itemTemplate = require('./item.html')
    , $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }
    , $items = controller.$el.find('.accounts')

    // Insert header
    $el.find('.header-placeholder').replaceWith(header(userId, 'accounts').$el)

    function itemsChanged(items) {
        $items.html($.map(items, function(item) {
            return itemTemplate(item)
        }))
    }

    function refresh() {
        api.call('admin/users/' + userId + '/accounts').done(itemsChanged)
    }
    refresh()

    return controller
}
