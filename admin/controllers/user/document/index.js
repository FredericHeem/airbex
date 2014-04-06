var header = require('../header')
, itemTemplate = require('./item.html')
, template = require('./index.html')
, format = require('util').format

module.exports = function(userId) {
    var $el = $('<div class="user-documents">').html(template({
        userId: userId
    }))
    , controller = {
        $el: $el
    }
    

    // Insert header
    $el.find('.header-placeholder').replaceWith(header(userId, 'orders').$el)
    
    var $items = controller.$el.find('.documents tbody')

    // Approve
    $items.on('click', '.approve', function(e) {
        e.preventDefault()
        var $button = $(this)
        , id = $button.attr('data-id')

        api.call('admin/users/documents/' + id + '/approve', null, { type: 'POST' })
        .fail(errors.alertFromXhr)
        .done(function() {
            $button.fadeAway()
            router.now()
        })
    })
   
    // Reject
    $items.on('click', '.reject', function(e) {
        e.preventDefault()
        var $button = $(this)
        , id = $button.attr('data-id')

        api.call('admin/users/documents/' + id + '/reject', null, { type: 'POST' })
        .fail(errors.alertFromXhr)
        .done(function() {
            $button.fadeAway()
            router.now()
        })
    })
    
    function documentChanged(items) {
        $items.html($.map(items, function(item) {
            var $item = $('<tr class=document>').html(itemTemplate(item))
            var $status = $item.find("#status")
            if(item.status == "Pending"){
                $status.addClass("label-warning")
            } else if(item.status == "Accepted"){
                $status.addClass("label-success")
            } else {
                $status.addClass("label-important")
            }

            return $item
        }))
    }

    function refresh() {
        api.call('admin/users/' + userId + '/documents')
        .fail(errors.alertFromXhr)
        .done(documentChanged)
    }

    refresh()

    return controller
}
