module.exports = function(api) {
    var itemTemplate = require('./item.html')
    , controller = {
        $el: $(require('./template.html')())
    }
    , $tbody = controller.$el.find('tbody')

    function marketsChanged(markets) {
        $tbody.html($.map(markets, function(market) {
            return itemTemplate(market)
        }))
    }

    function refresh() {
        api.call('markets').then(marketsChanged).done()
    }

    refresh()

    return controller
}
