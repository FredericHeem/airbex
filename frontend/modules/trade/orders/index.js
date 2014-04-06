var itemTemplate = require('./item.html')
, historyItemTemplate = require('./history-item.html')
, template = require('./index.html')
, nav = require('../nav')

module.exports = function() {
    var $el = $('<div class=trade-orders>').html(template())
    , controller = {
        $el: $el
    }
    , $items = $el.find('.active-orders .items')
    , $historyItems = $el.find('.order-history .items')

    function itemsChanged(items) {
        $items.append($.map(items, function(item) {
            var $el = $(itemTemplate(item))
            return $el
        }))
    }

    function historyItemsChanged(items) {
        $historyItems.append($.map(items, function(item) {
            item.base = item.market.substr(0, 3)
            item.quote = item.market.substr(3, 3)
            var $el = $(historyItemTemplate(item))
            $el.attr('data-id', item.id)
            return $el
        }))
    }

    function refresh() {
        api.call('v1/orders')
        .fail(errors.alertFromXhr)
        .done(itemsChanged)
    }

    function refreshHistory() {
        api.call('v1/orders/history')
        .fail(errors.alertFromXhr)
        .done(historyItemsChanged)
    }

    $items.on('click', 'button.cancel', function(e) {
        e.preventDefault()

        var $item = $(e.target).closest('.item')
        $(this).loading(true, 'Deleting...')

        api.call('v1/orders/' + $item.attr('data-id'), null, { type: 'DELETE' })
        .fail(function(err) {
            if (err.name == 'OrderNotFound') {
                alertify.alert('The order has already been deleted', function() {
                    router.reload()
                })
                return
            }

            errors.alertFromXhr(err)
        })
        .done(function() {
            api.balances()
            $item.remove()
        })
    })

    refresh()
    refreshHistory()

    $el.find('.trade-nav').replaceWith(nav('orders').$el)

    return controller
}
