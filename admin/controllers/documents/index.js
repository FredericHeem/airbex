var itemTemplate = require('./item.html')
, template = require('./index.html')
, format = require('util').format

module.exports = function() {
    var $el = $('<div class="documents">').html(template({
    }))
    , controller = {
        $el: $el
    }

    var $items = controller.$el.find('.documents tbody')
    
    function documentChanged(items) {
        $items.html($.map(items, function(item) {
            var $item = $('<tr class=document>').html(itemTemplate(item))
            return $item
        }))
    }

    function refresh() {
        api.call('admin/documents/users')
        .fail(errors.alertFromXhr)
        .done(documentChanged)
    }

    refresh()

    return controller
}
