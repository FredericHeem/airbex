module.exports = function() {
    var itemTemplate = require('./item.html')
    , $el = $(require('./template.html')())
    , controller = {
        $el: $el
    }
    , $balances = $el.find('.balances')

    function itemsChanged(items) {
        $balances.html($.map(items, function(item) {
            return itemTemplate(item)
        }))
    }

    function refresh() {
        api.call('admin/balances')
        .fail(errors.alertFromXhr)
        .done(itemsChanged)
    }

    refresh()

    $el.find('.nav a[href="#balances"]').parent().addClass('active')

    return controller
}
