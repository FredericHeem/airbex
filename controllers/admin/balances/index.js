var util = require('util')

module.exports = function(app, api) {
    var itemTemplate = require('./item.html')
    , controller = {
        $el: $(require('./template.html')())
    }
    , $balances = controller.$el.find('.balances')

    function itemsChanged(items) {
        $balances.html($.map(items, function(item) {
            return itemTemplate(item)
        }))
    }

    function refresh() {
        api.call('admin/balances').done(itemsChanged)
    }

    refresh()

    return controller
}
