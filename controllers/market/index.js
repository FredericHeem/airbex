module.exports = function(api, id) {
    var itemTemplate = require('./item.html')
    , controller = {
        $el: $(require('./template.html')({
            id: id
        }))
    }
    , $tbody = controller.$el.find('tbody')

    function depthChanged(depth) {
        $tbody.html($.map(depth, function(item) {
            return itemTemplate(item)
        }))
    }

    function refresh() {
        api.call('markets/' + id + '/depth').then(depthChanged).done()
    }

    refresh()

    return controller
}
