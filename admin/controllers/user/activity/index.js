var header = require('../header')
, formatActivity = require('../../../helpers/activity')

module.exports = function(userId) {
    var itemTemplate = require('./item.html')
    , $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }
    , $items = controller.$el.find('.activities')

    // Insert header
    $el.find('.header-placeholder').replaceWith(header(userId, 'activity').$el)

    function itemsChanged(items) {
        $items.html($.map(items, function(item) {
            item.text = formatActivity(item)
            return itemTemplate(item)
        }))
    }

    function refresh() {
        api.call('admin/users/' + userId + '/activity')
        .fail(errors.alertFromXhr)
        .done(itemsChanged)
    }

    refresh()

    return controller
}
