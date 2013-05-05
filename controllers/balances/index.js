module.exports = function(api) {
    var itemTemplate = require('./item.html')
    , controller = {
        $el: $(require('./template.html')())
    }
    , $tbody = controller.$el.find('tbody')

    function itemsChanged(items) {
        $tbody.html($.map(items, function(item) {
            return itemTemplate(item)
        }))
    }

    function refresh() {
        api.call('balances').then(itemsChanged).done()
    }

    refresh()

    return controller
}
